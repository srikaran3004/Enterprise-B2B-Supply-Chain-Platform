using System;
using System.Collections.Generic;
using System.Text;

namespace SupplyChain.Identity.Domain.Events;

public record DealerApprovedEvent(
    Guid UserId,
    string Email,
    string FullName,
    Guid ApprovedByAdminId
);
