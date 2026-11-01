using FluentValidation;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;

namespace Vaultz.Application.Features.Auth;

public sealed record UserProfileResponse(
    string Id,
    string Email,
    string FullName,
    string DefaultCurrencyCode);

public sealed record AuthResultResponse(
    string Id,
    string Email,
    string FullName,
    string DefaultCurrencyCode,
    string AccessToken,
    DateTimeOffset ExpiresAtUtc);

public sealed record UpdateDefaultCurrencyCommand(string DefaultCurrencyCode);

public sealed record UpdateProfileCommand(
    string FullName,
    string Email,
    string DefaultCurrencyCode);

public sealed class UpdateProfileValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
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

public sealed class AuthHandlers
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<RegisterUserCommand> _registerValidator;
    private readonly IValidator<LoginUserCommand> _loginValidator;
    private readonly IValidator<UpdateProfileCommand> _updateProfileValidator;
    private readonly IValidator<ChangePasswordCommand> _changePasswordValidator;

    public AuthHandlers(
        IAuthService authService,
        ICurrentUserService currentUser,
        IValidator<RegisterUserCommand> registerValidator,
        IValidator<LoginUserCommand> loginValidator,
        IValidator<UpdateProfileCommand> updateProfileValidator,
        IValidator<ChangePasswordCommand> changePasswordValidator)
    {
        _authService = authService;
        _currentUser = currentUser;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
        _updateProfileValidator = updateProfileValidator;
        _changePasswordValidator = changePasswordValidator;
    }

    public async Task<AuthResultResponse> RegisterAsync(
        RegisterUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _registerValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        return await _authService.RegisterAsync(command, cancellationToken);
    }

    public async Task<AuthResultResponse> LoginAsync(
        LoginUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _loginValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        return await _authService.LoginAsync(command, cancellationToken);
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
