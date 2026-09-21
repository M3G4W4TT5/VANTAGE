using System.Text.Json;

namespace Vantage.Api.Contracts;

public static class ContractJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    { Converters = { new UtcTimestampConverter() } };
}
