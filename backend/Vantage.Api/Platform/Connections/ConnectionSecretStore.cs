using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Vantage.Api.Persistence;

namespace Vantage.Api.Platform.Connections;

// The encryption key is operator-held, outside source control and ordinary application backups.
// Source adapters may resolve values only in the backend; REST never returns them.
public sealed class ConnectionSecretStore(VantageDbContext db, IConfiguration configuration)
{
    private byte[] Key()
    {
        var encoded = configuration["Connections:EncryptionKey"];
        if (string.IsNullOrWhiteSpace(encoded)) throw new InvalidOperationException("The local connection-secret key is not configured.");
        byte[] key;
        try { key = Convert.FromBase64String(encoded); }
        catch (FormatException) { throw new InvalidOperationException("The local connection-secret key is invalid."); }
        if (key.Length != 32) throw new InvalidOperationException("The local connection-secret key must contain 32 bytes.");
        return key;
    }
    public async Task<string> SetAsync(ConnectionRow connection, string value, CancellationToken ct)
    {
        if (value.Length is < 1 or > 4096) throw new ArgumentException("Credential must contain 1–4096 characters.");
        var id = Guid.NewGuid().ToString("N");
        var nonce = RandomNumberGenerator.GetBytes(12);
        var plaintext = System.Text.Encoding.UTF8.GetBytes(value);
        var ciphertext = new byte[plaintext.Length]; var tag = new byte[16];
        try { using var aes = new AesGcm(Key(), 16); aes.Encrypt(nonce, plaintext, ciphertext, tag,
            System.Text.Encoding.UTF8.GetBytes(connection.Id)); }
        finally { CryptographicOperations.ZeroMemory(plaintext); }
        var old = await db.ConnectionSecrets.Where(x => x.ConnectionId == connection.Id).ToArrayAsync(ct);
        db.ConnectionSecrets.RemoveRange(old);
        db.ConnectionSecrets.Add(new() { Id = id, ConnectionId = connection.Id, Nonce = nonce, Ciphertext = ciphertext,
            Tag = tag, UpdatedAt = DateTimeOffset.UtcNow });
        return id;
    }
    public async Task<string?> ResolveAsync(ConnectionRow connection, CancellationToken ct)
    {
        if (connection.CredentialRef is null) return null;
        var secret = await db.ConnectionSecrets.AsNoTracking().SingleOrDefaultAsync(x => x.Id == connection.CredentialRef &&
            x.ConnectionId == connection.Id, ct);
        if (secret is null) return null;
        var plaintext = new byte[secret.Ciphertext.Length];
        try
        {
            using var aes = new AesGcm(Key(), 16);
            aes.Decrypt(secret.Nonce, secret.Ciphertext, secret.Tag, plaintext,
                System.Text.Encoding.UTF8.GetBytes(connection.Id));
            return System.Text.Encoding.UTF8.GetString(plaintext);
        }
        finally { CryptographicOperations.ZeroMemory(plaintext); }
    }
}
