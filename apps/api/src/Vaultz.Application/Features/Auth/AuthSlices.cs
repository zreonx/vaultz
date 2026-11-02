using FluentValidation;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;

namespace Vaultz.Application.Features.Auth;

public sealed record UserProfileResponse(
    string Id,
    string Email,
    string FullName,
    string DefaultCurrencyCode,
    bool IsEmailVerified,
    bool TwoFactorEnabled,
    string TwoFactorType);

public sealed record AuthResultResponse(
    string Id,
    string Email,
    string FullName,
    string DefaultCurrencyCode,
    string AccessToken,
    DateTimeOffset ExpiresAtUtc,
    bool IsEmailVerified = true,
    bool RequiresTwoFactor = false,
    string? TwoFactorType = null,
    string? TwoFactorToken = null);

public sealed record TwoFactorSetupResponse(
    string SecretKey,
    string QrCodeUri,
    List<string> RecoveryCodes);

public sealed record UpdateDefaultCurrencyCommand(string DefaultCurrencyCode);

public sealed record UpdateProfileCommand(
    string FullName,
    string DefaultCurrencyCode);

public sealed class UpdateProfileValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DefaultCurrencyCode)
            .NotEmpty()
            .Length(3)
            .Matches("^[A-Za-z]{3}$")
            .WithMessage("DefaultCurrencyCode must be a 3-letter ISO 4217 currency code.");
    }
}

public sealed record ChangePasswordCommand(
    string CurrentPassword,
    string NewPassword);

public sealed class ChangePasswordValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Current password is required.");
        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(8).WithMessage("New password must be at least 8 characters long.")
            .MaximumLength(128)
            .Matches("[0-9]").WithMessage("New password must contain at least one number.")
            .Matches("[a-zA-Z]").WithMessage("New password must contain at least one letter.")
            .NotEqual(x => x.CurrentPassword).WithMessage("New password must be different from your current password.");
    }
}

public sealed record RegisterUserCommand(
    string Email,
    string Password,
    string FullName,
    string DefaultCurrencyCode = "USD");

public sealed class RegisterUserValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(128)
            .Matches("[0-9]").WithMessage("Password must contain at least one digit.")
            .Matches("[a-zA-Z]").WithMessage("Password must contain at least one letter.");
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DefaultCurrencyCode)
            .NotEmpty()
            .Length(3)
            .Matches("^[A-Za-z]{3}$")
            .WithMessage("DefaultCurrencyCode must be a 3-letter ISO 4217 currency code.");
    }
}

public sealed record LoginUserCommand(
    string Email,
    string Password);

public sealed class LoginUserValidator : AbstractValidator<LoginUserCommand>
{
    public LoginUserValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public sealed record VerifyEmailCommand(
    string Email,
    string Code);

public sealed class VerifyEmailValidator : AbstractValidator<VerifyEmailCommand>
{
    public VerifyEmailValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Code).NotEmpty().MinimumLength(6).MaximumLength(256);
    }
}

public sealed record ResendVerificationCommand(
    string Email);

public sealed class ResendVerificationValidator : AbstractValidator<ResendVerificationCommand>
{
    public ResendVerificationValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}

public sealed record VerifyTwoFactorCommand(
    string Email,
    string Code,
    string TwoFactorToken,
    bool IsRecoveryCode = false);

public sealed class VerifyTwoFactorValidator : AbstractValidator<VerifyTwoFactorCommand>
{
    public VerifyTwoFactorValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Code).NotEmpty();
        RuleFor(x => x.TwoFactorToken).NotEmpty();
    }
}

public sealed record ConfirmTwoFactorCommand(
    string SecretKey,
    string Code,
    List<string> RecoveryCodes,
    string Type = "Totp");

public sealed class ConfirmTwoFactorValidator : AbstractValidator<ConfirmTwoFactorCommand>
{
    public ConfirmTwoFactorValidator()
    {
        RuleFor(x => x.Code).NotEmpty();
    }
}

public sealed record DisableTwoFactorCommand(
    string Password);

public sealed class DisableTwoFactorValidator : AbstractValidator<DisableTwoFactorCommand>
{
    public DisableTwoFactorValidator()
    {
        RuleFor(x => x.Password).NotEmpty().WithMessage("Password is required to disable two-factor authentication.");
    }
}

public sealed record ForgotPasswordCommand(
    string Email);

public sealed class ForgotPasswordValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}

public sealed record ResetPasswordCommand(
    string Email,
    string Token,
    string NewPassword);

public sealed class ResetPasswordValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(8).WithMessage("New password must be at least 8 characters long.")
            .MaximumLength(128)
            .Matches("[0-9]").WithMessage("New password must contain at least one digit.")
            .Matches("[a-zA-Z]").WithMessage("New password must contain at least one letter.");
    }
}

public sealed class AuthHandlers
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<RegisterUserCommand> _registerValidator;
    private readonly IValidator<LoginUserCommand> _loginValidator;
    private readonly IValidator<VerifyEmailCommand> _verifyEmailValidator;
    private readonly IValidator<ResendVerificationCommand> _resendVerificationValidator;
    private readonly IValidator<VerifyTwoFactorCommand> _verifyTwoFactorValidator;
    private readonly IValidator<ConfirmTwoFactorCommand> _confirmTwoFactorValidator;
    private readonly IValidator<DisableTwoFactorCommand> _disableTwoFactorValidator;
    private readonly IValidator<ForgotPasswordCommand> _forgotPasswordValidator;
    private readonly IValidator<ResetPasswordCommand> _resetPasswordValidator;
    private readonly IValidator<UpdateProfileCommand> _updateProfileValidator;
    private readonly IValidator<ChangePasswordCommand> _changePasswordValidator;

    public AuthHandlers(
        IAuthService authService,
        ICurrentUserService currentUser,
        IValidator<RegisterUserCommand> registerValidator,
        IValidator<LoginUserCommand> loginValidator,
        IValidator<VerifyEmailCommand> verifyEmailValidator,
        IValidator<ResendVerificationCommand> resendVerificationValidator,
        IValidator<VerifyTwoFactorCommand> verifyTwoFactorValidator,
        IValidator<ConfirmTwoFactorCommand> confirmTwoFactorValidator,
        IValidator<DisableTwoFactorCommand> disableTwoFactorValidator,
        IValidator<ForgotPasswordCommand> forgotPasswordValidator,
        IValidator<ResetPasswordCommand> resetPasswordValidator,
        IValidator<UpdateProfileCommand> updateProfileValidator,
        IValidator<ChangePasswordCommand> changePasswordValidator)
    {
        _authService = authService;
        _currentUser = currentUser;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
        _verifyEmailValidator = verifyEmailValidator;
        _resendVerificationValidator = resendVerificationValidator;
        _verifyTwoFactorValidator = verifyTwoFactorValidator;
        _confirmTwoFactorValidator = confirmTwoFactorValidator;
        _disableTwoFactorValidator = disableTwoFactorValidator;
        _forgotPasswordValidator = forgotPasswordValidator;
        _resetPasswordValidator = resetPasswordValidator;
        _updateProfileValidator = updateProfileValidator;
        _changePasswordValidator = changePasswordValidator;
    }

    public async Task<AuthResultResponse> RegisterAsync(
        RegisterUserCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var validation = await _registerValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        return await _authService.RegisterAsync(command, clientIp, userAgent, cancellationToken);
    }

    public async Task<AuthResultResponse> LoginAsync(
        LoginUserCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var validation = await _loginValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        return await _authService.LoginAsync(command, clientIp, userAgent, cancellationToken);
    }

    public async Task<AuthResultResponse> VerifyEmailAsync(
        VerifyEmailCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var validation = await _verifyEmailValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        return await _authService.VerifyEmailAsync(command, clientIp, userAgent, cancellationToken);
    }

    public async Task ResendVerificationEmailAsync(
        ResendVerificationCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _resendVerificationValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        await _authService.ResendVerificationEmailAsync(command, cancellationToken);
    }

    public async Task<AuthResultResponse> VerifyTwoFactorAsync(
        VerifyTwoFactorCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var validation = await _verifyTwoFactorValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        return await _authService.VerifyTwoFactorAsync(command, clientIp, userAgent, cancellationToken);
    }

    public async Task<TwoFactorSetupResponse> SetupTwoFactorAsync(CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        return await _authService.SetupTwoFactorAsync(userId, cancellationToken);
    }

    public async Task<AuthResultResponse> ConfirmTwoFactorAsync(
        ConfirmTwoFactorCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _confirmTwoFactorValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        return await _authService.ConfirmTwoFactorAsync(userId, command, cancellationToken);
    }

    public async Task<AuthResultResponse> DisableTwoFactorAsync(
        DisableTwoFactorCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _disableTwoFactorValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        return await _authService.DisableTwoFactorAsync(userId, command, cancellationToken);
    }

    public async Task ForgotPasswordAsync(
        ForgotPasswordCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _forgotPasswordValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        await _authService.ForgotPasswordAsync(command, cancellationToken);
    }

    public async Task<AuthResultResponse> ResetPasswordAsync(
        ResetPasswordCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        var validation = await _resetPasswordValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        return await _authService.ResetPasswordAsync(command, clientIp, userAgent, cancellationToken);
    }

    public async Task<UserProfileResponse> GetMeAsync(CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var profile = await _authService.GetCurrentUserProfileAsync(userId, cancellationToken);
        if (profile is null)
        {
            throw new UnauthorizedAppException("Authenticated user profile was not found.");
        }

        return profile;
    }

    public async Task<AuthResultResponse> UpdateDefaultCurrencyAsync(
        UpdateDefaultCurrencyCommand command,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        return await _authService.UpdateDefaultCurrencyAsync(userId, command.DefaultCurrencyCode, cancellationToken);
    }

    public async Task<AuthResultResponse> UpdateProfileAsync(
        UpdateProfileCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _updateProfileValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        return await _authService.UpdateProfileAsync(userId, command, cancellationToken);
    }

    public async Task<AuthResultResponse> ChangePasswordAsync(
        ChangePasswordCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _changePasswordValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        return await _authService.ChangePasswordAsync(userId, command, cancellationToken);
    }
}
