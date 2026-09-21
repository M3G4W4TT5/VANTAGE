FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY contracts/ /build/contracts/
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0.401@sha256:2fa828c68761b1b8c23d7662dc134421b9d3b59fe1425fdbc80804e390cdb24d AS backend
WORKDIR /build
COPY Directory.Build.props ./
COPY infra/global.json ./global.json
COPY backend/ backend/
COPY contracts/ contracts/
RUN dotnet restore backend/Vantage.Api --locked-mode
RUN dotnet publish backend/Vantage.Api -c Release --no-restore -o /publish
COPY --from=frontend /build/frontend/dist/ /publish/wwwroot/

FROM mcr.microsoft.com/dotnet/aspnet:10.0.11@sha256:011bb5f30180717b1c8b65822ff2c99bcb96bc65af0164589751b83c7b4949f7
WORKDIR /app
COPY --from=backend /publish/ ./
USER $APP_UID
ENTRYPOINT ["dotnet", "Vantage.Api.dll"]
