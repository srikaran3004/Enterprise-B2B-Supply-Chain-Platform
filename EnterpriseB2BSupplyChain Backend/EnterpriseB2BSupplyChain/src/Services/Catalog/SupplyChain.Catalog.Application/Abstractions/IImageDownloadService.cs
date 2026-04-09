namespace SupplyChain.Catalog.Application.Abstractions;

/// <summary>
/// Downloads images from external URLs and saves them locally,
/// returning the internal storage path.
/// </summary>
public interface IImageDownloadService
{
    /// <summary>
    /// If the URL is an external HTTP(S) URL, downloads the image and saves it locally.
    /// Returns the internal file path. If the URL is already a local path, returns it as-is.
    /// </summary>
    Task<string?> DownloadAndStoreAsync(string? imageUrl, string filenamePrefix, CancellationToken ct = default);
}
