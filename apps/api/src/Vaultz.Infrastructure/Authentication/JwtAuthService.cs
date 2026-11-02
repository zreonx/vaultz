using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ValidationFailure = FluentValidation.Results.ValidationFailure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Application.Features.Auth;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Infrastructure.Authentication;

/// <summary>
/// Custom JWT authentication service backed by VaultzDbContext.Users, PBKDF2-SHA256 password hashing,
/// Resend email verification, TOTP two-factor authentication, and account lockout protection.
/// </summary>
public sealed class JwtAuthService : IAuthService
{
    private readonly IVaultzDbContext _dbContext;
    private readonly IEmailService _emailService;
    private readonly JwtOptions _jwtOptions;
    private readonly ILogger<JwtAuthService> _logger;
    private readonly INotificationService? _notificationService;

    public JwtAuthService(
        IVaultzDbContext dbContext,
        IEmailService emailService,
        IOptions<JwtOptions> jwtOptions,
        ILogger<JwtAuthService> logger,
        INotificationService? notificationService = null)
    {
        _dbContext = dbContext;
        _emailService = emailService;
        _jwtOptions = jwtOptions.Value;
        _logger = logger;
        _notificationService = notificationService;
    }

    public async Task<AuthResultResponse> RegisterAsync(
        RegisterUserCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = command.Email.Trim().ToLowerInvariant();
        var exists = await _dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (exists)
        {
            throw new AppValidationException([
                new ValidationFailure(nameof(command.Email), "An account with this email address already exists.")
            ]);
        }

        var passwordHash = PasswordHasher.HashPassword(command.Password);
        var user = new UserAccount(
            normalizedEmail,
            command.FullName,
            passwordHash,
            command.DefaultCurrencyCode);

        // Generate 6-digit email verification code expiring in 15 minutes
        var verificationOtp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
        user.SetEmailVerificationToken(verificationOtp, DateTimeOffset.UtcNow.AddMinutes(15));

        _dbContext.Users.Add(user);

        var userId = user.Id.ToString();
        var defaultCategories = new[]
        {
            new Category(userId, "Salary & Payroll", CategoryType.Income, "#2A6B58"),
            new Category(userId, "Freelance & Dividends", CategoryType.Income, "#3B7A67"),
            new Category(userId, "Housing & Utilities", CategoryType.Expense, "#5E6B73"),
            new Category(userId, "Groceries & Dining", CategoryType.Expense, "#8C6D46"),
            new Category(userId, "Transportation", CategoryType.Expense, "#4F6D7A"),
            new Category(userId, "Health & Wellness", CategoryType.Expense, "#7A5C61")
        };

        _dbContext.Categories.AddRange(defaultCategories);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Dispatch verification email in background
        _ = _emailService.SendEmailVerificationAsync(
            user.Email,
            user.FullName,
            verificationOtp,
            $"http://localhost:3000/verify-email?email={Uri.EscapeDataString(user.Email)}&code={verificationOtp}",
            CancellationToken.None);

        return CreateAuthResult(user, isEmailVerified: false);
    }

    public async Task<AuthResultResponse> VerifyEmailAsync(
        VerifyEmailCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = command.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken)
            ?? throw new AppValidationException([
                new ValidationFailure(nameof(command.Code), "Invalid verification request.")
            ]);

        if (user.IsEmailVerified)
        {
            return CreateAuthResult(user);
        }

        if (!user.EmailVerificationTokenExpiresAtUtc.HasValue ||
            user.EmailVerificationTokenExpiresAtUtc.Value < DateTimeOffset.UtcNow)
        {
            throw new AppValidationException([
                new ValidationFailure(nameof(command.Code), "Verification code has expired. Please request a new one.")
            ]);
        }

        if (!string.Equals(user.EmailVerificationToken, command.Code.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new AppValidationException([
                new ValidationFailure(nameof(command.Code), "Invalid verification code.")
            ]);
        }

        user.VerifyEmail();
        user.RecordSuccessfulLogin(DateTimeOffset.UtcNow, clientIp, userAgent);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreateAuthResult(user);
    }

    public async Task ResendVerificationEmailAsync(
        ResendVerificationCommand command,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = command.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user is null || user.IsEmailVerified)
        {
            return; // Silently return to prevent user enumeration
        }

        var verificationOtp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
        user.SetEmailVerificationToken(verificationOtp, DateTimeOffset.UtcNow.AddMinutes(15));
        await _dbContext.SaveChangesAsync(cancellationToken);

        _ = _emailService.SendEmailVerificationAsync(
            user.Email,
            user.FullName,
            verificationOtp,
            $"http://localhost:3000/verify-email?email={Uri.EscapeDataString(user.Email)}&code={verificationOtp}",
            CancellationToken.None);
    }

    public async Task<AuthResultResponse> LoginAsync(
        LoginUserCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = command.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user is null)
        {
            throw new UnauthorizedAppException("Invalid email or password.");
        }

        var now = DateTimeOffset.UtcNow;
        if (user.IsLockedOut(now))
        {
            var remainingMinutes = Math.Max(1, Math.Ceiling((user.LockoutEndUtc!.Value - now).TotalMinutes));
            throw new AppValidationException([
                new ValidationFailure(nameof(command.Email), $"Account is temporarily locked due to multiple failed login attempts. Please try again in {remainingMinutes} minute(s).")
            ]);
        }

        if (!PasswordHasher.VerifyPassword(command.Password, user.PasswordHash))
        {
            user.RecordFailedLogin(now, maxAttempts: 5, lockoutMinutes: 15);
            if (user.IsLockedOut(now))
            {
                _ = _emailService.SendSecurityAlertAsync(
                    user.Email,
                    user.FullName,
                    "Account Locked Due to Failed Sign-In Attempts",
                    "Your account has been temporarily locked for 15 minutes following 5 consecutive failed sign-in attempts.",
                    CancellationToken.None);
            }
            await _dbContext.SaveChangesAsync(cancellationToken);

            throw new UnauthorizedAppException("Invalid email or password.");
        }

        // Email verification requirement
        if (!user.IsEmailVerified)
        {
            var verificationOtp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
            user.SetEmailVerificationToken(verificationOtp, now.AddMinutes(15));
            await _dbContext.SaveChangesAsync(cancellationToken);

            _ = _emailService.SendEmailVerificationAsync(
                user.Email,
                user.FullName,
                verificationOtp,
                $"http://localhost:3000/verify-email?email={Uri.EscapeDataString(user.Email)}&code={verificationOtp}",
                CancellationToken.None);

            return CreateAuthResult(user, isEmailVerified: false);
        }

        // 2FA requirement
        if (user.TwoFactorEnabled)
        {
            var twoFactorToken = GenerateTwoFactorSessionToken(user);

            if (user.TwoFactorType == TwoFactorType.EmailOtp || user.TwoFactorType == TwoFactorType.Hybrid)
            {
                var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
                user.SetTwoFactorOtp(otp, now.AddMinutes(10));
                await _dbContext.SaveChangesAsync(cancellationToken);

                _ = _emailService.SendTwoFactorOtpAsync(user.Email, user.FullName, otp, CancellationToken.None);

                return new AuthResultResponse(
                    user.Id.ToString(),
                    user.Email,
                    user.FullName,
                    user.DefaultCurrencyCode,
                    "",
                    DateTimeOffset.MinValue,
                    IsEmailVerified: true,
                    RequiresTwoFactor: true,
                    TwoFactorType: "EmailOtp",
                    TwoFactorToken: twoFactorToken);
            }
            else
            {
                return new AuthResultResponse(
                    user.Id.ToString(),
                    user.Email,
                    user.FullName,
                    user.DefaultCurrencyCode,
                    "",
                    DateTimeOffset.MinValue,
                    IsEmailVerified: true,
                    RequiresTwoFactor: true,
                    TwoFactorType: "Totp",
                    TwoFactorToken: twoFactorToken);
            }
        }

        // Check for new device login alert
        if (!string.IsNullOrEmpty(user.LastLoginIp) && !string.Equals(user.LastLoginIp, clientIp, StringComparison.OrdinalIgnoreCase))
        {
            _ = _emailService.SendNewDeviceLoginAlertAsync(
                user.Email,
                user.FullName,
                clientIp ?? "Unknown IP",
                userAgent ?? "Unknown Browser",
                now,
                CancellationToken.None);
        }

        user.RecordSuccessfulLogin(now, clientIp, userAgent);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreateAuthResult(user);
    }

    public async Task<AuthResultResponse> VerifyTwoFactorAsync(
        VerifyTwoFactorCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = command.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user is null || !user.TwoFactorEnabled)
        {
            throw new UnauthorizedAppException("Two-factor authentication is not active for this account.");
        }

        if (!ValidateTwoFactorSessionToken(command.TwoFactorToken, user))
        {
            throw new UnauthorizedAppException("Two-factor authentication session expired. Please sign in again.");
        }

        if (command.IsRecoveryCode)
        {
            if (!user.ConsumeRecoveryCode(command.Code))
            {
                throw new AppValidationException([
                    new ValidationFailure(nameof(command.Code), "Invalid backup recovery code.")
                ]);
            }
        }
        else
        {
            var cleanCode = command.Code.Trim();
            if (user.TwoFactorType == TwoFactorType.Totp)
            {
                if (string.IsNullOrWhiteSpace(user.TwoFactorSecret) || !TotpService.VerifyTotp(user.TwoFactorSecret, cleanCode))
                {
                    throw new AppValidationException([
                        new ValidationFailure(nameof(command.Code), "Invalid 6-digit authenticator code.")
                    ]);
                }
            }
            else
            {
                if (!user.TwoFactorOtpExpiresAtUtc.HasValue || user.TwoFactorOtpExpiresAtUtc.Value < DateTimeOffset.UtcNow)
                {
                    throw new AppValidationException([
                        new ValidationFailure(nameof(command.Code), "Two-factor code has expired. Please sign in again to receive a fresh code.")
                    ]);
                }

                if (!string.Equals(user.TwoFactorOtpCode, cleanCode, StringComparison.OrdinalIgnoreCase))
                {
                    throw new AppValidationException([
                        new ValidationFailure(nameof(command.Code), "Invalid two-factor code.")
                    ]);
                }

                user.ClearTwoFactorOtp();
            }
        }

        var now = DateTimeOffset.UtcNow;
        if (!string.IsNullOrEmpty(user.LastLoginIp) && !string.Equals(user.LastLoginIp, clientIp, StringComparison.OrdinalIgnoreCase))
        {
            _ = _emailService.SendNewDeviceLoginAlertAsync(
                user.Email,
                user.FullName,
                clientIp ?? "Unknown IP",
                userAgent ?? "Unknown Browser",
                now,
                CancellationToken.None);
        }

        user.RecordSuccessfulLogin(now, clientIp, userAgent);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreateAuthResult(user);
    }

    public async Task<TwoFactorSetupResponse> SetupTwoFactorAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedId))
        {
            throw new UnauthorizedAppException("Invalid authenticated user identifier.");
        }

        var user = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == parsedId, cancellationToken)
            ?? throw new UnauthorizedAppException("Authenticated user profile was not found.");

        var secret = TotpService.GenerateSecretKey();
        var qrUri = TotpService.GenerateQrCodeUri(user.Email, secret);
        var recoveryCodes = TotpService.GenerateRecoveryCodes();

        return new TwoFactorSetupResponse(secret, qrUri, recoveryCodes);
    }

    public async Task<AuthResultResponse> ConfirmTwoFactorAsync(
        string userId,
        ConfirmTwoFactorCommand command,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedId))
        {
            throw new UnauthorizedAppException("Invalid authenticated user identifier.");
        }

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == parsedId, cancellationToken)
            ?? throw new UnauthorizedAppException("Authenticated user profile was not found.");

        if (string.Equals(command.Type, "Totp", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(command.SecretKey) || !TotpService.VerifyTotp(command.SecretKey, command.Code))
            {
                throw new AppValidationException([
                    new ValidationFailure(nameof(command.Code), "Invalid 6-digit authenticator code. Check that your device time is synchronized.")
                ]);
            }

            user.EnableTwoFactor(TwoFactorType.Totp, command.SecretKey, string.Join(',', command.RecoveryCodes));
        }
        else
        {
            user.EnableTwoFactor(TwoFactorType.EmailOtp, null, string.Join(',', command.RecoveryCodes));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _ = _emailService.SendSecurityAlertAsync(
            user.Email,
            user.FullName,
            "Two-Factor Authentication Enabled",
            "Two-factor authentication has been successfully activated on your Vaultz account.",
            CancellationToken.None);

        if (_notificationService != null)
        {
            _ = _notificationService.SendAsync(
                user.Id.ToString(),
                "Two-Factor Authentication Enabled",
                "Two-Factor Authentication (2FA) is now active on your account.",
                NotificationType.SecurityAlert,
                actionUrl: "/settings",
                cancellationToken: CancellationToken.None);
        }

        return CreateAuthResult(user);
    }

    public async Task<AuthResultResponse> DisableTwoFactorAsync(
        string userId,
        DisableTwoFactorCommand command,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedId))
        {
            throw new UnauthorizedAppException("Invalid authenticated user identifier.");
        }

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == parsedId, cancellationToken)
            ?? throw new UnauthorizedAppException("Authenticated user profile was not found.");

        if (!PasswordHasher.VerifyPassword(command.Password, user.PasswordHash))
        {
            throw new AppValidationException([
                new ValidationFailure(nameof(command.Password), "Incorrect password.")
            ]);
        }

        user.DisableTwoFactor();
        await _dbContext.SaveChangesAsync(cancellationToken);

        _ = _emailService.SendSecurityAlertAsync(
            user.Email,
            user.FullName,
            "Two-Factor Authentication Disabled",
            "Two-factor authentication has been turned off for your Vaultz account. If you did not make this change, please reset your password immediately.",
            CancellationToken.None);

        if (_notificationService != null)
        {
            _ = _notificationService.SendAsync(
                user.Id.ToString(),
                "Two-Factor Authentication Disabled",
                "Two-Factor Authentication was disabled on your account.",
                NotificationType.SecurityAlert,
                actionUrl: "/settings",
                cancellationToken: CancellationToken.None);
        }

        return CreateAuthResult(user);
    }

    public async Task ForgotPasswordAsync(
        ForgotPasswordCommand command,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = command.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user is null)
        {
            return; // Prevent email enumeration
        }

        var resetOtp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
        user.SetPasswordResetToken(resetOtp, DateTimeOffset.UtcNow.AddMinutes(15));
        await _dbContext.SaveChangesAsync(cancellationToken);

        var resetLink = $"http://localhost:3000/reset-password?email={Uri.EscapeDataString(user.Email)}&token={resetOtp}";
        _ = _emailService.SendPasswordResetAsync(user.Email, user.FullName, resetOtp, resetLink, CancellationToken.None);
    }

    public async Task<AuthResultResponse> ResetPasswordAsync(
        ResetPasswordCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = command.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user is null)
        {
            throw new AppValidationException([
                new ValidationFailure(nameof(command.Token), "Invalid password reset request.")
            ]);
        }

        if (!user.PasswordResetTokenExpiresAtUtc.HasValue || user.PasswordResetTokenExpiresAtUtc.Value < DateTimeOffset.UtcNow)
        {
            throw new AppValidationException([
                new ValidationFailure(nameof(command.Token), "Password reset link or code has expired. Please request a new one.")
            ]);
        }

        if (!string.Equals(user.PasswordResetToken, command.Token.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new AppValidationException([
                new ValidationFailure(nameof(command.Token), "Invalid password reset code.")
            ]);
        }

        var newHash = PasswordHasher.HashPassword(command.NewPassword);
        user.UpdatePasswordHash(newHash);
        user.RecordSuccessfulLogin(DateTimeOffset.UtcNow, clientIp, userAgent);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _ = _emailService.SendSecurityAlertAsync(
            user.Email,
            user.FullName,
            "Password Changed Successfully",
            "The password for your Vaultz account was recently changed. All active sessions have been securely invalidated.",
            CancellationToken.None);

        return CreateAuthResult(user);
    }

    public async Task<UserProfileResponse?> GetCurrentUserProfileAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedId))
        {
            return null;
        }

        var user = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == parsedId, cancellationToken);

        return user is null
            ? null
            : new UserProfileResponse(
                user.Id.ToString(),
                user.Email,
                user.FullName,
                user.DefaultCurrencyCode,
                user.IsEmailVerified,
                user.TwoFactorEnabled,
                user.TwoFactorType.ToString());
    }

    public async Task<AuthResultResponse> UpdateDefaultCurrencyAsync(
        string userId,
        string defaultCurrencyCode,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedId))
        {
            throw new UnauthorizedAppException("Invalid authenticated user identifier.");
        }

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == parsedId, cancellationToken)
            ?? throw new UnauthorizedAppException("Authenticated user profile was not found.");

        user.UpdateDefaultCurrency(defaultCurrencyCode);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreateAuthResult(user);
    }

    /// <summary>
    /// Updates full name and currency. Notice email is immutable by user security directive.
    /// </summary>
    public async Task<AuthResultResponse> UpdateProfileAsync(
        string userId,
        UpdateProfileCommand command,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedId))
        {
            throw new UnauthorizedAppException("Invalid authenticated user identifier.");
        }

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == parsedId, cancellationToken)
            ?? throw new UnauthorizedAppException("Authenticated user profile was not found.");

        user.UpdateProfile(command.FullName, command.DefaultCurrencyCode);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreateAuthResult(user);
    }

    public async Task<AuthResultResponse> ChangePasswordAsync(
        string userId,
        ChangePasswordCommand command,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedId))
        {
            throw new UnauthorizedAppException("Invalid authenticated user identifier.");
        }

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == parsedId, cancellationToken)
            ?? throw new UnauthorizedAppException("Authenticated user profile was not found.");

        if (!PasswordHasher.VerifyPassword(command.CurrentPassword, user.PasswordHash))
        {
            throw new AppValidationException([
                new ValidationFailure(nameof(command.CurrentPassword), "Your current password is incorrect.")
            ]);
        }

        var newHash = PasswordHasher.HashPassword(command.NewPassword);
        user.UpdatePasswordHash(newHash);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _ = _emailService.SendSecurityAlertAsync(
            user.Email,
            user.FullName,
            "Password Changed",
            "Your Vaultz account password was changed. If you did not perform this action, please contact support immediately.",
            CancellationToken.None);

        if (_notificationService != null)
        {
            _ = _notificationService.SendAsync(
                user.Id.ToString(),
                "Password Changed Successfully",
                "Your account password was updated. If you did not do this, please secure your account immediately.",
                NotificationType.SecurityAlert,
                actionUrl: "/settings",
                cancellationToken: CancellationToken.None);
        }

        return CreateAuthResult(user);
    }

    private AuthResultResponse CreateAuthResult(UserAccount user, bool? isEmailVerified = null)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var expiresAtUtc = nowUtc.AddMinutes(_jwtOptions.ExpirationMinutes);

        var verified = isEmailVerified ?? user.IsEmailVerified;
        var token = CreateToken(user, expiresAtUtc);

        return new AuthResultResponse(
            user.Id.ToString(),
            user.Email,
            user.FullName,
            user.DefaultCurrencyCode,
            token,
            expiresAtUtc,
            IsEmailVerified: verified,
            RequiresTwoFactor: false);
    }

    private string CreateToken(UserAccount user, DateTimeOffset expiresAtUtc)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim("currency", user.DefaultCurrencyCode),
            new Claim("security_stamp", user.SecurityStamp)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAtUtc.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);
    }

    private string GenerateTwoFactorSessionToken(UserAccount user)
    {
        var claims = new[]
        {
            new Claim("two_factor_user_id", user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim("purpose", "two_factor_auth")
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);
    }

    private bool ValidateTwoFactorSessionToken(string token, UserAccount user)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;

        try
        {
            var handler = new JwtSecurityTokenHandler();
            var parameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _jwtOptions.Issuer,
                ValidateAudience = true,
                ValidAudience = _jwtOptions.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SigningKey)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            };

            var principal = handler.ValidateToken(token, parameters, out _);
            var userId = principal.FindFirst("two_factor_user_id")?.Value;
            var purpose = principal.FindFirst("purpose")?.Value;

            return string.Equals(userId, user.Id.ToString(), StringComparison.Ordinal) &&
                   string.Equals(purpose, "two_factor_auth", StringComparison.Ordinal);
        }
        catch
        {
            return false;
        }
    }
}
