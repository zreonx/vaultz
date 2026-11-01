namespace Vaultz.Application.Common.Exceptions;

/// <summary>
/// Thrown when a requested entity does not exist or does not belong to the authenticated user.
/// </summary>
public sealed class NotFoundException : Exception
{
    public string ResourceName { get; }
    public string ResourceKey { get; }

    public NotFoundException(string resourceName, object resourceKey)
        : base($"Resource '{resourceName}' ({resourceKey}) was not found.")
    {
        ResourceName = resourceName;
        ResourceKey = resourceKey.ToString() ?? string.Empty;
    }
}
