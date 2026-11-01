namespace Vaultz.Domain.Common;

/// <summary>
/// Base class for persisted domain entities with UTC audit timestamps.
/// </summary>
public abstract class AuditableEntity
{
    public Guid Id { get; protected init; } = Guid.NewGuid();
    public DateTimeOffset CreatedAtUtc { get; protected init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; protected set; }

    protected void MarkUpdated(DateTimeOffset timestampUtc)
    {
        UpdatedAtUtc = timestampUtc;
    }
}
