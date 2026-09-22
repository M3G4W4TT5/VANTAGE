<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('totp'); section>
    <#if section = "header">
        ${msg("doLogIn")}
    <#elseif section = "form">
        <form id="kc-otp-login-form" class="vantage-login-form vantage-otp-form" onsubmit="login.disabled = true; return true;"
              action="${url.loginAction}" method="post">
            <#if otpLogin.userOtpCredentials?size gt 1>
                <div class="vantage-otp-choices">
                    <#list otpLogin.userOtpCredentials as otpCredential>
                        <label for="kc-otp-credential-${otpCredential?index}">
                            <input id="kc-otp-credential-${otpCredential?index}" type="radio" name="selectedCredentialId"
                                   value="${otpCredential.id}" <#if otpCredential.id == otpLogin.selectedCredentialId>checked</#if>>
                            <span>${otpCredential.userLabel}</span>
                        </label>
                    </#list>
                </div>
            </#if>

            <div class="vantage-field vantage-otp-field">
                <label for="otp">${msg("loginOtpOneTime")}</label>
                <input id="otp" name="otp" autocomplete="one-time-code" inputmode="numeric" type="text"
                       autofocus aria-invalid="<#if messagesPerField.existsError('totp')>true</#if>" dir="ltr">
                <#if messagesPerField.existsError('totp')>
                    <p id="input-error-otp-code" class="vantage-field-error" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('totp'))?no_esc}
                    </p>
                </#if>
            </div>

            <button class="vantage-sign-in" name="login" id="kc-login" type="submit">
                <span>${msg("doLogIn")}</span>
                <img src="${url.resourcesPath}/img/arrow-right.svg" alt="">
            </button>
        </form>
    </#if>
</@layout.registrationLayout>
