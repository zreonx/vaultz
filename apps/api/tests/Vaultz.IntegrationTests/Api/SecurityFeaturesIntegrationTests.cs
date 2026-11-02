using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Vaultz.Application.Features.Auth;
using Vaultz.Domain.Enums;
using Vaultz.Infrastructure.Authentication;
using Vaultz.Infrastructure.Persistence;
using Xunit;

namespace Vaultz.IntegrationTests.Api;

public sealed class SecurityFeaturesIntegrationTests
{
    private static WebApplicationFactory<Program> CreateTestFactory(string databaseName)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<VaultzDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<VaultzDbContext>>();

                services.AddDbContext<VaultzDbContext>(options =>
                {
                    options.UseInMemoryDatabase(databaseName);
                });
            });
        });
    }

    [Fact]
    public async Task Registration_AndEmailVerification_FlowWorksEndToEnd()
    {
        var dbName = Guid.NewGuid().ToString();
        using var factory = CreateTestFactory(dbName);
        using var client = factory.CreateClient();

        // 1. Register User
        var registerCommand = new RegisterUserCommand("newuser@vaultz.local", "Password123", "New User", "USD");
        var registerRes = await client.PostAsJsonAsync("/api/v1/auth/register", registerCommand);
        Assert.Equal(HttpStatusCode.Created, registerRes.StatusCode);

        var regData = await registerRes.Content.ReadFromJsonAsync<AuthResultResponse>();
        Assert.NotNull(regData);
        Assert.False(regData.IsEmailVerified);
        Assert.NotEmpty(regData.AccessToken);

        // 2. Fetch OTP token from DB
        string? otpCode;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VaultzDbContext>();
            var user = await db.Users.FirstAsync(u => u.Email == "newuser@vaultz.local");
            otpCode = user.EmailVerificationToken;
        }

        Assert.NotNull(otpCode);
        Assert.Equal(6, otpCode.Length);

        // 3. Verify Email with OTP
        var verifyRes = await client.PostAsJsonAsync("/api/v1/auth/verify-email", new VerifyEmailCommand("newuser@vaultz.local", otpCode));
        Assert.Equal(HttpStatusCode.OK, verifyRes.StatusCode);

        var verifyData = await verifyRes.Content.ReadFromJsonAsync<AuthResultResponse>();
        Assert.NotNull(verifyData);
        Assert.True(verifyData.IsEmailVerified);
    }

    [Fact]
    public async Task BruteForceLockout_TriggersAfter5FailedAttempts_AndBlocksLogin()
    {
        var dbName = Guid.NewGuid().ToString();
        using var factory = CreateTestFactory(dbName);
        using var client = factory.CreateClient();

        // Register
        await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserCommand("lockout@vaultz.local", "Password123", "Lockout Target", "USD"));

        // 5 consecutive failed login attempts
        for (int i = 1; i <= 5; i++)
        {
            var badRes = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new LoginUserCommand("lockout@vaultz.local", "WrongPassword!"));

            // First 4 return 401 Unauthorized
            if (i < 5)
            {
                Assert.Equal(HttpStatusCode.Unauthorized, badRes.StatusCode);
            }
        }

        // 6th attempt should hit lockout check -> 400 Bad Request with Lockout details
        var lockedRes = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginUserCommand("lockout@vaultz.local", "Password123"));

        Assert.Equal(HttpStatusCode.BadRequest, lockedRes.StatusCode);
        var content = await lockedRes.Content.ReadAsStringAsync();
        Assert.Contains("temporarily locked", content);
    }

    [Fact]
    public async Task TwoFactorAuthentication_SetupAndEnforcement_WorksEndToEnd()
    {
        var dbName = Guid.NewGuid().ToString();
        using var factory = CreateTestFactory(dbName);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

        // 1. Register & verify
        await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserCommand("twofa@vaultz.local", "Password123", "2FA User", "USD"));

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VaultzDbContext>();
            var u = await db.Users.FirstAsync(u => u.Email == "twofa@vaultz.local");
            u.VerifyEmail();
            await db.SaveChangesAsync();
        }

        // 2. Request 2FA Setup
        var setupRes = await client.PostAsync("/api/v1/auth/2fa/setup", null);
        Assert.Equal(HttpStatusCode.OK, setupRes.StatusCode);

        var setupData = await setupRes.Content.ReadFromJsonAsync<TwoFactorSetupResponse>();
        Assert.NotNull(setupData);
        Assert.NotEmpty(setupData.SecretKey);
        Assert.NotEmpty(setupData.RecoveryCodes);

        // 3. Confirm 2FA using valid TOTP code
        var currentTotp = TotpService.GenerateCurrentTotp(setupData.SecretKey);
        var confirmRes = await client.PostAsJsonAsync("/api/v1/auth/2fa/confirm", new ConfirmTwoFactorCommand(
            setupData.SecretKey,
            currentTotp,
            setupData.RecoveryCodes,
            "Totp"));
        Assert.Equal(HttpStatusCode.OK, confirmRes.StatusCode);

        // 4. Log out
        await client.PostAsync("/api/v1/auth/logout", null);

        // 5. Fresh Login Attempt -> Must require 2FA
        var loginRes = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginUserCommand("twofa@vaultz.local", "Password123"));
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);

        var loginData = await loginRes.Content.ReadFromJsonAsync<AuthResultResponse>();
        Assert.NotNull(loginData);
        Assert.True(loginData.RequiresTwoFactor);
        Assert.NotNull(loginData.TwoFactorToken);
        Assert.Empty(loginData.AccessToken); // Token not issued yet

        // 6. Complete 2FA Challenge with TOTP code
        var freshTotp = TotpService.GenerateCurrentTotp(setupData.SecretKey);
        var verify2FaRes = await client.PostAsJsonAsync(
            "/api/v1/auth/verify-2fa",
            new VerifyTwoFactorCommand("twofa@vaultz.local", freshTotp, loginData.TwoFactorToken, IsRecoveryCode: false));
        Assert.Equal(HttpStatusCode.OK, verify2FaRes.StatusCode);

        var finalAuth = await verify2FaRes.Content.ReadFromJsonAsync<AuthResultResponse>();
        Assert.NotNull(finalAuth);
        Assert.NotEmpty(finalAuth.AccessToken);
    }

    [Fact]
    public async Task TwoFactorAuthentication_BackupRecoveryCode_EnablesLogin()
    {
        var dbName = Guid.NewGuid().ToString();
        using var factory = CreateTestFactory(dbName);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

        // Register and enable 2FA directly
        await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserCommand("recovery@vaultz.local", "Password123", "Recovery User", "USD"));

        string recoveryCode = "A1B2-C3D4";
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VaultzDbContext>();
            var u = await db.Users.FirstAsync(u => u.Email == "recovery@vaultz.local");
            u.VerifyEmail();
            u.EnableTwoFactor(TwoFactorType.Totp, "JBSWY3DPEHPK3PXP", recoveryCode);
            await db.SaveChangesAsync();
        }

        // Login with credentials
        var loginRes = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginUserCommand("recovery@vaultz.local", "Password123"));
        var loginData = (await loginRes.Content.ReadFromJsonAsync<AuthResultResponse>())!;

        // Use recovery code to authenticate
        var verifyRes = await client.PostAsJsonAsync(
            "/api/v1/auth/verify-2fa",
            new VerifyTwoFactorCommand("recovery@vaultz.local", recoveryCode, loginData.TwoFactorToken!, IsRecoveryCode: true));
        Assert.Equal(HttpStatusCode.OK, verifyRes.StatusCode);

        var auth = await verifyRes.Content.ReadFromJsonAsync<AuthResultResponse>();
        Assert.NotNull(auth);
        Assert.NotEmpty(auth.AccessToken);

        // Attempting to reuse the same recovery code should now fail
        var secondLoginRes = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginUserCommand("recovery@vaultz.local", "Password123"));
        var secondLoginData = (await secondLoginRes.Content.ReadFromJsonAsync<AuthResultResponse>())!;

        var reuseRes = await client.PostAsJsonAsync(
            "/api/v1/auth/verify-2fa",
            new VerifyTwoFactorCommand("recovery@vaultz.local", recoveryCode, secondLoginData.TwoFactorToken!, IsRecoveryCode: true));
        Assert.Equal(HttpStatusCode.BadRequest, reuseRes.StatusCode);
    }

    [Fact]
    public async Task PasswordResetFlow_WithToken_UpdatesPasswordAndInvalidatesOld()
    {
        var dbName = Guid.NewGuid().ToString();
        using var factory = CreateTestFactory(dbName);
        using var client = factory.CreateClient();

        await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserCommand("reset@vaultz.local", "OldPassword123", "Reset User", "USD"));

        // 1. Forgot password
        var forgotRes = await client.PostAsJsonAsync(
            "/api/v1/auth/forgot-password",
            new ForgotPasswordCommand("reset@vaultz.local"));
        Assert.Equal(HttpStatusCode.OK, forgotRes.StatusCode);

        // 2. Read reset token
        string? resetToken;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VaultzDbContext>();
            var u = await db.Users.FirstAsync(u => u.Email == "reset@vaultz.local");
            resetToken = u.PasswordResetToken;
        }

        Assert.NotNull(resetToken);

        // 3. Reset password
        var resetRes = await client.PostAsJsonAsync(
            "/api/v1/auth/reset-password",
            new ResetPasswordCommand("reset@vaultz.local", resetToken, "BrandNewPassword123"));
        Assert.Equal(HttpStatusCode.OK, resetRes.StatusCode);

        // 4. Verify old password fails
        var oldLoginRes = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginUserCommand("reset@vaultz.local", "OldPassword123"));
        Assert.Equal(HttpStatusCode.Unauthorized, oldLoginRes.StatusCode);

        // 5. Verify new password succeeds
        var newLoginRes = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginUserCommand("reset@vaultz.local", "BrandNewPassword123"));
        Assert.Equal(HttpStatusCode.OK, newLoginRes.StatusCode);
    }

    [Fact]
    public async Task EmailAddress_IsPermanentlyImmutable_CannotBeModified()
    {
        var dbName = Guid.NewGuid().ToString();
        using var factory = CreateTestFactory(dbName);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

        var regRes = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserCommand("immutable@vaultz.local", "Password123", "Initial Name", "USD"));
        var initialUser = (await regRes.Content.ReadFromJsonAsync<AuthResultResponse>())!;

        // Update profile
        var updateRes = await client.PutAsJsonAsync(
            "/api/v1/auth/profile",
            new UpdateProfileCommand("Renamed User", "EUR"));
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);

        var updatedProfile = (await updateRes.Content.ReadFromJsonAsync<AuthResultResponse>())!;
        Assert.Equal("Renamed User", updatedProfile.FullName);
        Assert.Equal("EUR", updatedProfile.DefaultCurrencyCode);
        Assert.Equal("immutable@vaultz.local", updatedProfile.Email);

        // Assert database record has the original immutable email
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VaultzDbContext>();
            var user = await db.Users.FirstAsync(u => u.Id.ToString() == initialUser.Id);
            Assert.Equal("immutable@vaultz.local", user.Email);
            Assert.Equal("Renamed User", user.FullName);
        }
    }
}
