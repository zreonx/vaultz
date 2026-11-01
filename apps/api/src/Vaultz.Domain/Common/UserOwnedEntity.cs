namespace Vaultz.Domain.Common;

/// <summary>
/// Base class for financial domain records that are strictly owned by a single user.
/// </summary>
public abstract class UserOwnedEntity : AuditableEntity
{
    public string UserId { get; private set; }

    protected UserOwnedEntity(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new DomainException("Every financial record must be associated with an owning user ID.", "missing_user_id");
        }

        UserId = userId.Trim();
    }

    // Parameterless constructor for EF Core materialization
    protected UserOwnedEntity()
    {
        UserId = string.Empty;
    }
}
