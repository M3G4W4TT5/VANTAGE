using Microsoft.AspNetCore.Antiforgery;
using Microsoft.Extensions.Options;
using Vantage.Api.Contracts;

namespace Vantage.Api.Platform.Identity;

public static class RequestSecurity
{
    public static void ApplyResponseHeaders(HttpContext context)
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        // no-referrer makes Chromium send Origin:null on native form navigations,
        // defeating the strict same-origin check on our CSRF-protected sign-out form.
        context.Response.Headers["Referrer-Policy"] = "same-origin";
        var path = context.Request.Path;
        if (path.StartsWithSegments("/api") || path.StartsWithSegments("/hubs") || path.StartsWithSegments("/auth") ||
            path == "/signin-oidc" || path == "/signout-callback-oidc") context.Response.Headers.CacheControl = "no-store";
    }
    public static async Task Enforce(HttpContext context, RequestDelegate next)
    {
        var path = context.Request.Path;
        var protectedPath = path.StartsWithSegments("/api") || path.StartsWithSegments("/hubs") || path == "/auth/logout";
        var publicPath = path == "/api/v1/session" || path == "/api/v1/health";
        if (protectedPath && !publicPath && context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new ApiError("unauthenticated", "Sign in to VANTAGE.")); return;
        }
        var unsafeMethod = !HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method) && !HttpMethods.IsOptions(context.Request.Method);
        if (protectedPath && (unsafeMethod || path.StartsWithSegments("/hubs")))
        {
            var origin = context.Request.Headers.Origin.ToString();
            var expected = context.RequestServices.GetRequiredService<IOptions<IdentityOptions>>().Value.PublicOrigin.TrimEnd('/');
            if (origin.Length > 0 && !string.Equals(origin, expected, StringComparison.Ordinal))
            {
                context.Response.StatusCode = 403; await context.Response.WriteAsJsonAsync(new ApiError("invalid_origin", "The request origin is not allowed.")); return;
            }
            if (unsafeMethod)
            {
                try { await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context); }
                catch (AntiforgeryValidationException)
                {
                    context.Response.StatusCode = 400; await context.Response.WriteAsJsonAsync(new ApiError("invalid_csrf", "Refresh the session before retrying this action.")); return;
                }
            }
        }
        await next(context);
    }
}
