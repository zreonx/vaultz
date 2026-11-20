using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Entities;

namespace Vaultz.Application.Features.QuickNotes;

public sealed record QuickNoteResponse(
    Guid Id,
    string Title,
    string Content,
    string ColorHex,
    bool IsPinned,
    bool IsArchived,
    Guid? AccountId,
    string? AccountName,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record CreateQuickNoteCommand(
    string Title,
    string Content,
    string? ColorHex = null,
    bool IsPinned = false,
    Guid? AccountId = null);

public sealed record UpdateQuickNoteCommand(
    string Title,
    string Content,
    string? ColorHex,
    bool IsPinned,
    bool IsArchived,
    Guid? AccountId = null);

public sealed class CreateQuickNoteValidator : AbstractValidator<CreateQuickNoteCommand>
{
    public CreateQuickNoteValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Content).NotEmpty().MaximumLength(4000);
        When(x => !string.IsNullOrWhiteSpace(x.ColorHex), () =>
        {
            RuleFor(x => x.ColorHex!)
                .Must(c => c.Trim().Length == 7 && c.Trim()[0] == '#' && c.Trim().Skip(1).All(Uri.IsHexDigit))
                .WithMessage("ColorHex must match #RRGGBB.");
        });
    }
}

public sealed class UpdateQuickNoteValidator : AbstractValidator<UpdateQuickNoteCommand>
{
    public UpdateQuickNoteValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Content).NotEmpty().MaximumLength(4000);
        When(x => !string.IsNullOrWhiteSpace(x.ColorHex), () =>
        {
            RuleFor(x => x.ColorHex!)
                .Must(c => c.Trim().Length == 7 && c.Trim()[0] == '#' && c.Trim().Skip(1).All(Uri.IsHexDigit))
                .WithMessage("ColorHex must match #RRGGBB.");
        });
    }
}

public sealed class QuickNoteHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateQuickNoteCommand> _createValidator;
    private readonly IValidator<UpdateQuickNoteCommand> _updateValidator;

    public QuickNoteHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<CreateQuickNoteCommand> createValidator,
        IValidator<UpdateQuickNoteCommand> updateValidator)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<IReadOnlyList<QuickNoteResponse>> GetQuickNotesAsync(
        Guid? accountId = null,
        bool includeArchived = false,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var query = _dbContext.QuickNotes
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (!includeArchived)
        {
            query = query.Where(n => !n.IsArchived);
        }

        if (accountId.HasValue)
        {
            query = query.Where(n => n.AccountId == null || n.AccountId == accountId.Value);
        }

        var notes = await query
            .OrderByDescending(n => n.IsPinned)
            .ThenByDescending(n => n.UpdatedAtUtc ?? n.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            notes = notes
                .Where(n =>
                    n.Title.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    n.Content.Contains(term, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        var accounts = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, a => a.Name, cancellationToken);

        return notes.Select(n => MapToResponse(n, accounts)).ToList();
    }

    public async Task<QuickNoteResponse> CreateQuickNoteAsync(
        CreateQuickNoteCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        await ValidateAccountAsync(userId, command.AccountId, cancellationToken);

        var note = new QuickNote(
            userId,
            command.Title,
            command.Content,
            command.ColorHex,
            command.IsPinned,
            command.AccountId);

        _dbContext.QuickNotes.Add(note);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await LoadMappedSingleAsync(userId, note.Id, cancellationToken);
    }

    public async Task<QuickNoteResponse> UpdateQuickNoteAsync(
        Guid id,
        UpdateQuickNoteCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _updateValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        var note = await _dbContext.QuickNotes
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuickNote), id);

        await ValidateAccountAsync(userId, command.AccountId, cancellationToken);

        note.Update(
            command.Title,
            command.Content,
            command.ColorHex,
            command.IsPinned,
            command.IsArchived,
            command.AccountId);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await LoadMappedSingleAsync(userId, note.Id, cancellationToken);
    }

    public async Task<QuickNoteResponse> TogglePinAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var note = await _dbContext.QuickNotes
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuickNote), id);

        note.TogglePin();
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await LoadMappedSingleAsync(userId, note.Id, cancellationToken);
    }

    public async Task DeleteQuickNoteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var note = await _dbContext.QuickNotes
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuickNote), id);

        _dbContext.QuickNotes.Remove(note);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task ValidateAccountAsync(
        string userId,
        Guid? accountId,
        CancellationToken cancellationToken)
    {
        if (!accountId.HasValue)
        {
            return;
        }

        var exists = await _dbContext.Accounts
            .AsNoTracking()
            .AnyAsync(a => a.Id == accountId.Value && a.UserId == userId, cancellationToken);

        if (!exists)
        {
            throw new NotFoundException(nameof(FinancialAccount), accountId.Value);
        }
    }

    private async Task<QuickNoteResponse> LoadMappedSingleAsync(
        string userId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var note = await _dbContext.QuickNotes
            .AsNoTracking()
            .FirstAsync(n => n.Id == id && n.UserId == userId, cancellationToken);

        string? accountName = null;
        if (note.AccountId.HasValue)
        {
            accountName = await _dbContext.Accounts
                .AsNoTracking()
                .Where(a => a.Id == note.AccountId.Value && a.UserId == userId)
                .Select(a => a.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new QuickNoteResponse(
            note.Id,
            note.Title,
            note.Content,
            note.ColorHex,
            note.IsPinned,
            note.IsArchived,
            note.AccountId,
            accountName,
            note.CreatedAtUtc,
            note.UpdatedAtUtc);
    }

    private static QuickNoteResponse MapToResponse(
        QuickNote n,
        IReadOnlyDictionary<Guid, string> accounts)
    {
        string? accountName = null;
        if (n.AccountId.HasValue)
        {
            accounts.TryGetValue(n.AccountId.Value, out accountName);
        }

        return new QuickNoteResponse(
            n.Id,
            n.Title,
            n.Content,
            n.ColorHex,
            n.IsPinned,
            n.IsArchived,
            n.AccountId,
            accountName,
            n.CreatedAtUtc,
            n.UpdatedAtUtc);
    }
}
