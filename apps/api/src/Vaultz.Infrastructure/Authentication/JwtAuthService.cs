using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentValidation.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Application.Features.Auth;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Infrastructure.Authentication;

/// <summary>
/// Custom JWT authentication service backed by VaultzDbContext.Users and PBKDF2-SHA256 password hashing.
/// </summary>
public sealed class JwtAuthService : IAuthService
{
    private readonly IVaultzDbContext _dbContext;
    private readonly JwtOptions _jwtOptions;

    public JwtAuthService(
        IVaultzDbContext dbContext,
        IOptions<JwtOptions> jwtOptions)
    {
        _dbContext = dbContext;
        _jwtOptions = jwtOptions.Value;
    }

    public async Task<AuthResultResponse> RegisterAsync(
        RegisterUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = command.Email.Trim().ToLowerInvariant();
        var exists = await _dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (exists)
        {
            throw new AppValidationException([
                new FluentValidation.Results.ValidationFailure(nameof(command.Email), "An account with this email address already exists.")
            ]);
        }

        var passwordHash = PasswordHasher.HashPassword(command.Password);
        var user = new UserAccount(
            normalizedEmail,
            command.FullName,
            passwordHash,
            command.DefaultCurrencyCode);

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

        return CreateAuthResult(user);
    }

    public async Task<AuthResultResponse> LoginAsync(
        LoginUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = command.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user is null || !PasswordHasher.VerifyPassword(command.Password, user.PasswordHash))
        {
            throw new UnauthorizedAppException("Invalid email or password.");
        }

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
                user.DefaultCurrencyCode);
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

        var normalizedEmail = command.Email.Trim().ToLowerInvariant();
        if (!string.Equals(user.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
        {
            var emailTaken = await _dbContext.Users
                .AsNoTracking()
                .AnyAsync(u => u.Email == normalizedEmail && u.Id != parsedId, cancellationToken);

            if (emailTaken)
            {
                throw new AppValidationException([
                    new FluentValidation.Results.ValidationFailure(nameof(command.Email), "Another account is already using this email address.")
                ]);
            }
        }

        user.UpdateProfile(command.FullName, normalizedEmail, command.DefaultCurrencyCode);
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
                new FluentValidation.Results.ValidationFailure(nameof(command.CurrentPassword), "Your current password is incorrect.")
            ]);
        }

        var newHash = PasswordHasher.HashPassword(command.NewPassword);
        user.UpdatePasswordHash(newHash);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreateAuthResult(user);
    }

    private AuthResultResponse CreateAuthResult(UserAccount user)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var expiresAtUtc = nowUtc.AddMinutes(_jwtOptions.ExpirationMinutes);

        var keyBytes = Encoding.UTF8.GetBytes(_jwtOptions.SigningKey);
        var signingKey = new SymmetricSecurityKey(keyBytes);
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim("currency", user.DefaultCurrencyCode),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var tokenDescriptor = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: nowUtc.UtcDateTime,
            expires: expiresAtUtc.UtcDateTime,
            signingCredentials: credentials);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);

        return new AuthResultResponse(
            user.Id.ToString(),
            user.Email,
            user.FullName,
            user.DefaultCurrencyCode,
            tokenString,
            expiresAtUtc);
    }
}
