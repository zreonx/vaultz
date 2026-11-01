using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.Categories;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/categories")]
[Produces("application/json")]
public sealed class CategoriesController : ControllerBase
{
    private readonly CategoryHandlers _handlers;

    public CategoriesController(CategoryHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CategoryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CategoryResponse>>> GetCategories(
        [FromQuery] Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var categories = await _handlers.GetCategoriesAsync(accountId, cancellationToken);
        return Ok(categories);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<CategoryResponse>> CreateCategory(
        [FromBody] CreateCategoryCommand command,
        CancellationToken cancellationToken = default)
    {
        var created = await _handlers.CreateCategoryAsync(command, cancellationToken);
        return Created($"/api/v1/categories/{created.Id}", created);
    }

    public sealed record UpdateCategoryRequest(string Name, string? ColorHex, bool IsArchived);

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CategoryResponse>> UpdateCategory(
        Guid id,
        [FromBody] UpdateCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.UpdateCategoryAsync(
            new UpdateCategoryCommand(id, request.Name, request.ColorHex, request.IsArchived),
            cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteCategory(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteCategoryAsync(id, cancellationToken);
        return NoContent();
    }
}
