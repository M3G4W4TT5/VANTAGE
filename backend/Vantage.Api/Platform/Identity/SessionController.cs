using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Vantage.Api.Contracts;

namespace Vantage.Api.Platform.Identity;

[ApiController]
public sealed class SessionController(BackendSessions sessions, PlatformAccess access, IAntiforgery antiforgery,
    IOptions<IdentityOptions> configured, IIdentitySessionProbe provider) : ControllerBase
{
    [AllowAnonymous, HttpGet("api/v1/session", Name = "GetSession")]
    public async Task<ActionResult<SessionDto>> Get(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        var entry = sessions.Find(User.FindFirstValue(SessionClaims.SessionId) ?? "");
        if (User.Identity?.IsAuthenticated != true || entry is null) return new SessionDto(1, false, null, null, null, null);
        var user = await access.RequireUserAsync(ct);
        sessions.SetDataAccess(entry, user.CanUseData);
        return new SessionDto(1, true, new(user.Id, user.DisplayName, user.CanUseData), entry.ExpiresAt,
            antiforgery.GetAndStoreTokens(HttpContext).RequestToken!, entry.PublicKey);
    }
    [AllowAnonymous, HttpGet("auth/login")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public IActionResult Login()
    {
        if (!configured.Value.Configured) return StatusCode(503, new ApiError("identity_setup_required", "Configure the local identity provider before signing in."));
        // The return destination is fixed, never copied from untrusted query parameters.
        return Challenge(new AuthenticationProperties { RedirectUri = "/" }, OpenIdConnectDefaults.AuthenticationScheme);
    }
    [Authorize, HttpGet("auth/account")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> Account(CancellationToken ct)
    {
        await access.RequireUserAsync(ct);
        return Redirect(configured.Value.Authority.TrimEnd('/') + "/account/");
    }
    [HttpPost("auth/logout")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> Logout()
    {
        var entry = sessions.Find(User.FindFirstValue(SessionClaims.SessionId) ?? "");
        if (entry is not null)
        {
            sessions.Terminate(entry.Id); // Stop demand before any external request/redirect.
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(configured.Value.ProviderTimeoutSeconds));
            try { await provider.RevokeAsync(entry.Probe, timeout.Token); } catch (Exception) { /* Local sign-out is already effective. */ }
        }
        return SignOut(new AuthenticationProperties { RedirectUri = "/" },
            CookieAuthenticationDefaults.AuthenticationScheme, OpenIdConnectDefaults.AuthenticationScheme);
    }
}
