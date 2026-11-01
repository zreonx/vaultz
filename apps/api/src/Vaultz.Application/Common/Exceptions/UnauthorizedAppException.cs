namespace Vaultz.Application.Common.Exceptions;

public sealed class UnauthorizedAppException : Exception
{
    public UnauthorizedAppException(string message = "Authentication is required to perform this operation.")
        : base(message)
    {
    }
}
