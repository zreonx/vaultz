using System.Security.Cryptography;
using System.Text;

namespace Vaultz.Infrastructure.Authentication;

/// <summary>
/// Lightweight, dependency-free RFC 6238 TOTP (Time-based One-Time Password) implementation.
/// Compatible with Google Authenticator, 1Password, Microsoft Authenticator, and Authy.
/// </summary>
public static class TotpService
{
    private const string Base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static readonly TimeSpan Step = TimeSpan.FromSeconds(30);

    public static string GenerateSecretKey(int length = 20)
    {
        var bytes = RandomNumberGenerator.GetBytes(length);
        return ToBase32String(bytes);
    }

    public static string GenerateCurrentTotp(string secretKey)
    {
        var keyBytes = FromBase32String(secretKey.Trim());
        var currentStep = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30;
        return GenerateCode(keyBytes, currentStep);
    }

    public static bool VerifyTotp(string secretKey, string code, int allowedDriftSteps = 1)
    {
        if (string.IsNullOrWhiteSpace(secretKey) || string.IsNullOrWhiteSpace(code) || code.Trim().Length != 6)
        {
            return false;
        }

        byte[] keyBytes;
        try
        {
            keyBytes = FromBase32String(secretKey.Trim());
        }
        catch
        {
            return false;
        }

        var currentStep = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30;

        for (var i = -allowedDriftSteps; i <= allowedDriftSteps; i++)
        {
            var computedCode = GenerateCode(keyBytes, currentStep + i);
            if (string.Equals(computedCode, code.Trim(), StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    public static string GenerateQrCodeUri(string email, string secretKey, string issuer = "Vaultz")
    {
        var encodedIssuer = Uri.EscapeDataString(issuer);
        var encodedEmail = Uri.EscapeDataString(email);
        return $"otpauth://totp/{encodedIssuer}:{encodedEmail}?secret={secretKey}&issuer={encodedIssuer}&algorithm=SHA1&digits=6&period=30";
    }

    public static List<string> GenerateRecoveryCodes(int count = 8)
    {
        var codes = new List<string>(count);
        for (var i = 0; i < count; i++)
        {
            var bytes = RandomNumberGenerator.GetBytes(5);
            var hex = Convert.ToHexString(bytes).ToLowerInvariant();
            codes.Add($"{hex[..5]}-{hex[5..]}");
        }
        return codes;
    }

    private static string GenerateCode(byte[] key, long timeStep)
    {
        var timeBytes = BitConverter.GetBytes(timeStep);
        if (BitConverter.IsLittleEndian)
        {
            Array.Reverse(timeBytes);
        }

        using var hmac = new HMACSHA1(key);
        var hash = hmac.ComputeHash(timeBytes);

        var offset = hash[^1] & 0x0F;
        var binaryCode =
            ((hash[offset] & 0x7F) << 24) |
            ((hash[offset + 1] & 0xFF) << 16) |
            ((hash[offset + 2] & 0xFF) << 8) |
            (hash[offset + 3] & 0xFF);

        var otp = binaryCode % 1000000;
        return otp.ToString("D6");
    }

    private static string ToBase32String(byte[] bytes)
    {
        var result = new StringBuilder((bytes.Length * 8 + 4) / 5);
        int buffer = 0, bitsLeft = 0;

        foreach (var b in bytes)
        {
            buffer = (buffer << 8) | b;
            bitsLeft += 8;

            while (bitsLeft >= 5)
            {
                bitsLeft -= 5;
                result.Append(Base32Chars[(buffer >> bitsLeft) & 0x1F]);
            }
        }

        if (bitsLeft > 0)
        {
            result.Append(Base32Chars[(buffer << (5 - bitsLeft)) & 0x1F]);
        }

        return result.ToString();
    }

    private static byte[] FromBase32String(string base32)
    {
        base32 = base32.Trim().ToUpperInvariant();
        var output = new List<byte>((base32.Length * 5) / 8);
        int buffer = 0, bitsLeft = 0;

        foreach (var c in base32)
        {
            var val = Base32Chars.IndexOf(c);
            if (val < 0) continue;

            buffer = (buffer << 5) | val;
            bitsLeft += 5;

            if (bitsLeft >= 8)
            {
                bitsLeft -= 8;
                output.Add((byte)((buffer >> bitsLeft) & 0xFF));
            }
        }

        return output.ToArray();
    }
}
