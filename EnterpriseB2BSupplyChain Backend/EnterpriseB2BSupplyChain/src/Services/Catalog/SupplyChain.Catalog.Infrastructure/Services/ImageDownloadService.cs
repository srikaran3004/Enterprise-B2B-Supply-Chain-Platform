using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SupplyChain.Catalog.Application.Abstractions;

namespace SupplyChain.Catalog.Infrastructure.Services;

public class ImageDownloadService : IImageDownloadService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ImageDownloadService> _logger;
    private readonly string _storagePath;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"
    };

    public ImageDownloadService(
        HttpClient httpClient,
        ILogger<ImageDownloadService> logger,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _storagePath = configuration["ImageStorage:Path"]
            ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "products");
    }

    public async Task<string?> DownloadAndStoreAsync(string? imageUrl, string filenamePrefix, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return null;

        // If it's already a local/relative path (not an external URL), return as-is
        if (!imageUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !imageUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return imageUrl;
        }

        try
        {
            _logger.LogInformation("Downloading product image from: {Url}", imageUrl);

            using var response = await _httpClient.GetAsync(imageUrl, ct);
            response.EnsureSuccessStatusCode();

            var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
            var extension = GetExtensionFromContentType(contentType, imageUrl);

            if (!AllowedExtensions.Contains(extension))
            {
                _logger.LogWarning("Unsupported image type '{Extension}' from {Url}. Using original URL.", extension, imageUrl);
                return imageUrl;
            }

            var imageBytes = await response.Content.ReadAsByteArrayAsync(ct);

            if (imageBytes.Length == 0)
            {
                _logger.LogWarning("Empty image downloaded from {Url}. Using original URL.", imageUrl);
                return imageUrl;
            }

            // Ensure storage directory exists
            Directory.CreateDirectory(_storagePath);

            var sanitizedPrefix = SanitizeFilename(filenamePrefix);
            var fileName = $"{sanitizedPrefix}_{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(_storagePath, fileName);

            await File.WriteAllBytesAsync(filePath, imageBytes, ct);

            // Return the relative web path
            var relativePath = $"/images/products/{fileName}";
            _logger.LogInformation("Image saved: {Path} ({Bytes} bytes)", relativePath, imageBytes.Length);
            return relativePath;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to download image from {Url}. Keeping original URL.", imageUrl);
            return imageUrl;
        }
    }

    private static string GetExtensionFromContentType(string contentType, string url)
    {
        var ext = contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/gif" => ".gif",
            "image/webp" => ".webp",
            "image/bmp" => ".bmp",
            "image/svg+xml" => ".svg",
            _ => Path.GetExtension(new Uri(url).AbsolutePath)
        };

        return string.IsNullOrEmpty(ext) ? ".jpg" : ext;
    }

    private static string SanitizeFilename(string input)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Concat(input.Where(c => !invalid.Contains(c)));
    }
}
