using System.Security.Cryptography;

namespace Vaultz.Infrastructure.Authentication;

/// <summary>
/// Self-contained PBKDF2-SHA256 password hasher with cryptographic salt and constant-time verification.
/// </summary>
public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, KeySize);

        return $"v1.{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public static bool VerifyPassword(string password, string storedHash)
    {
        if (string.IsNullOrWhiteSpace(storedHash))
        {
            return false;
        }

        var parts = storedHash.Split('.');
        if (parts.Length != 4 || parts[0] != "v1" || !int.TryParse(parts[1], out var iterations))
        {
            return false;
        }

        try
        {
            var salt = Convert.FromBase64String(parts[2]);
            var expectedHash = Convert.FromBase64String(parts[3]);
            var computedHash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iterations,
                Algorithm,
                expectedHash.Length);

            return CryptographicOperations.FixedTimeEquals(computedHash, expectedHash);
        }
        catch
        {
            return false;
        }
    }
}
