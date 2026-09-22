<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password'); section>
    <#if section = "header">
        ${msg("loginAccountTitle")}
    <#elseif section = "form">
        <form id="kc-form-login" class="vantage-login-form" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
            <div class="vantage-credentials">
                <#if !usernameHidden??>
                    <div class="vantage-field">
                        <label for="username"><#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if></label>
                        <input tabindex="1" id="username" name="username" value="${(login.username!'')}" type="text"
                               autofocus autocomplete="username" dir="ltr"
                               aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>">
                    </div>
                </#if>

                <div class="vantage-field">
                    <label for="password">${msg("password")}</label>
                    <div class="vantage-password-field" dir="ltr">
                        <input tabindex="2" id="password" name="password" type="password" autocomplete="current-password"
                               aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>">
                        <button class="vantage-password-toggle ${properties.kcFormPasswordVisibilityButtonClass!}" type="button"
                                aria-label="${msg("showPassword")}" aria-controls="password" data-password-toggle tabindex="3"
                                data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}"
                                data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                                data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                            <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </div>

            <#if messagesPerField.existsError('username','password')>
                <p id="input-error" class="vantage-field-error" aria-live="polite">
                    ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                </p>
            </#if>

            <div class="vantage-form-options">
                <button class="vantage-inert-option vantage-remember" type="button" disabled aria-disabled="true">
                    <img src="${url.resourcesPath}/img/circle-check.svg" alt="">
                    <span>Remember me</span>
                </button>
                <button class="vantage-inert-option vantage-forgot" type="button" disabled aria-disabled="true">Forgot?</button>
            </div>

            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>
            <button tabindex="4" class="vantage-sign-in" name="login" id="kc-login" type="submit">
                <span>${msg("doLogIn")}</span>
                <img src="${url.resourcesPath}/img/arrow-right.svg" alt="">
            </button>
        </form>
        <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    </#if>
</@layout.registrationLayout>
