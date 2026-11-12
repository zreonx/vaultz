using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.Accounts;
using Vaultz.Domain.Enums;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/accounts")]
[Produces("application/json")]
public sealed class AccountsController : ControllerBase
{
    private readonly AccountHandlers _handlers;

    public AccountsController(AccountHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AccountResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AccountResponse>>> GetAccounts(
        [FromQuery] bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        var accounts = await _handlers.GetAccountsAsync(includeArchived, cancellationToken);
        return Ok(accounts);
    }

    [HttpPost]
    [ProducesResponseType(typeof(AccountResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<AccountResponse>> CreateAccount(
        [FromBody] CreateAccountCommand command,
        CancellationToken cancellationToken = default)
    {
        var created = await _handlers.CreateAccountAsync(command, cancellationToken);
        return Created($"/api/v1/accounts/{created.Id}", created);
    }

    public sealed record UpdateAccountRequest(string Name, AccountType? Type = null, bool? IsArchived = null);

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AccountResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AccountResponse>> UpdateAccount(
        Guid id,
        [FromBody] UpdateAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.UpdateAccountAsync(
            new UpdateAccountCommand(id, request.Name, request.Type, request.IsArchived),
            cancellationToken);
        return Ok(updated);
    }

    [HttpPut("{id:guid}/default")]
    [ProducesResponseType(typeof(AccountResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AccountResponse>> SetDefaultAccount(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.SetDefaultAccountAsync(id, cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAccount(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteAccountAsync(id, cancellationToken);
        return NoContent();
    }
}
