using System;
using System.Collections.Generic;
using System.Text;

namespace SupplyChain.Identity.Domain.Events;

public record DealerRegisteredEvent(
    Guid UserId,
    string Email,
    string FullName
);
