using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SupplyChain.Identity.Domain.Entities;
using SupplyChain.Identity.Domain.Enums;
using SupplyChain.Identity.Infrastructure.Services;

namespace SupplyChain.Identity.Infrastructure.Persistence.Seed;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IdentityDbContext context, IConfiguration configuration)
    {
        await SeedSuperAdminAsync(context, configuration);
        await SeedDeliveryAgentsAsync(context);
    }

    // ─── Super Admin ───────────────────────────────────────────────────────────
    private static async Task SeedSuperAdminAsync(IdentityDbContext context, IConfiguration configuration)
    {
        var email    = (configuration["SuperAdmin:Email"]    ?? "superadmin@unidistrib.com").Trim().ToLowerInvariant();
        var password = configuration["SuperAdmin:Password"]  ?? "SuperAdmin@123";
        var fullName = configuration["SuperAdmin:FullName"]  ?? "UniDistrib Super Admin";

        if (await context.Users.AnyAsync(u => u.Email == email))
            return;

        var hasher       = new PasswordHasherService();
        var passwordHash = hasher.Hash(password);
        var superAdmin   = User.CreateStaff(email, passwordHash, fullName, UserRole.SuperAdmin);

        await context.Users.AddAsync(superAdmin);
        await context.SaveChangesAsync();
    }

    // ─── Delivery Agents ───────────────────────────────────────────────────────
    // Mirrors the agent list in LogisticsSeeder so each seeded agent has a matching
    // Identity user they can log in with (password: Agent@123).
    private static async Task SeedDeliveryAgentsAsync(IdentityDbContext context)
    {
        const string agentPassword = "Agent@123";

        // Format: (email, fullName, phone)
        var agentData = new (string Email, string FullName, string Phone)[]
        {
            // Bihar
            ("rajesh.kumar.br@unidistrib.com",      "Rajesh Kumar",      "9123456701"),
            ("amit.singh.br@unidistrib.com",         "Amit Singh",        "9123456702"),
            ("pankaj.yadav.br@unidistrib.com",       "Pankaj Yadav",      "9123456703"),
            ("sunil.gupta.br@unidistrib.com",        "Sunil Gupta",       "9123456704"),
            // Maharashtra
            ("suresh.patil.mh@unidistrib.com",       "Suresh Patil",      "9134567801"),
            ("ganesh.shinde.mh@unidistrib.com",      "Ganesh Shinde",     "9134567802"),
            ("rohan.deshmukh.mh@unidistrib.com",     "Rohan Deshmukh",    "9134567803"),
            ("ajay.pawar.mh@unidistrib.com",         "Ajay Pawar",        "9134567804"),
            // Karnataka
            ("ravi.kumar.ka@unidistrib.com",         "Ravi Kumar",        "9145678901"),
            ("manjunath.gowda.ka@unidistrib.com",    "Manjunath Gowda",   "9145678902"),
            ("prakash.shetty.ka@unidistrib.com",     "Prakash Shetty",    "9145678903"),
            ("harish.naik.ka@unidistrib.com",        "Harish Naik",       "9145678904"),
            // Tamil Nadu
            ("karthik.reddy.tn@unidistrib.com",      "Karthik Reddy",     "9156789001"),
            ("arjun.kumar.tn@unidistrib.com",        "Arjun Kumar",       "9156789002"),
            ("vignesh.babu.tn@unidistrib.com",       "Vignesh Babu",      "9156789003"),
            // Uttar Pradesh
            ("deepak.sharma.up@unidistrib.com",      "Deepak Sharma",     "9167890101"),
            ("mohit.verma.up@unidistrib.com",        "Mohit Verma",       "9167890102"),
            ("ankit.tiwari.up@unidistrib.com",       "Ankit Tiwari",      "9167890103"),
            // Gujarat
            ("hardik.patel.gj@unidistrib.com",       "Hardik Patel",      "9178901201"),
            ("jignesh.shah.gj@unidistrib.com",       "Jignesh Shah",      "9178901202"),
            ("kunal.mehta.gj@unidistrib.com",        "Kunal Mehta",       "9178901203"),
            // West Bengal
            ("subhajit.roy.wb@unidistrib.com",       "Subhajit Roy",      "9189012301"),
            ("arindam.das.wb@unidistrib.com",        "Arindam Das",       "9189012302"),
            ("suman.chatterjee.wb@unidistrib.com",   "Suman Chatterjee",  "9189012303"),
            // Rajasthan
            ("mahendra.singh.rj@unidistrib.com",     "Mahendra Singh",    "9190123401"),
            ("dinesh.kumar.rj@unidistrib.com",       "Dinesh Kumar",      "9190123402"),
            ("lokesh.meena.rj@unidistrib.com",       "Lokesh Meena",      "9190123403"),
            // Delhi
            ("arun.sharma.dl@unidistrib.com",        "Arun Sharma",       "9810200001"),
            ("pradeep.gupta.dl@unidistrib.com",      "Pradeep Gupta",     "9810200002"),
            ("manish.verma.dl@unidistrib.com",       "Manish Verma",      "9810200003"),
            // Telangana
            ("ravi.teja.ts@unidistrib.com",          "Ravi Teja",         "9848800001"),
            ("srinivas.rao.ts@unidistrib.com",       "Srinivas Rao",      "9848800002"),
            ("venkat.reddy.ts@unidistrib.com",       "Venkat Reddy",      "9848800003"),
            // Kerala
            ("vishnu.nair.kl@unidistrib.com",        "Vishnu Nair",       "9847000001"),
            ("anil.menon.kl@unidistrib.com",         "Anil Menon",        "9847000002"),
            ("manoj.pillai.kl@unidistrib.com",       "Manoj Pillai",      "9847000003"),
            // Punjab
            ("harpreet.singh.pb@unidistrib.com",     "Harpreet Singh",    "9815100001"),
            ("gurdeep.kaur.pb@unidistrib.com",       "Gurdeep Kaur",      "9815100002"),
            ("jaspreet.sidhu.pb@unidistrib.com",     "Jaspreet Sidhu",    "9815100003"),
            // Madhya Pradesh
            ("ajay.tiwari.mp@unidistrib.com",        "Ajay Tiwari",       "9826200001"),
            ("rahul.jain.mp@unidistrib.com",         "Rahul Jain",        "9826200002"),
            ("sandeep.yadav.mp@unidistrib.com",      "Sandeep Yadav",     "9826200003"),
            // Andhra Pradesh
            ("suresh.naidu.ap@unidistrib.com",       "Suresh Naidu",      "9866300001"),
            ("krishna.babu.ap@unidistrib.com",       "Krishna Babu",      "9866300002"),
            ("ramesh.raju.ap@unidistrib.com",        "Ramesh Raju",       "9866300003"),
            // Odisha
            ("biswajit.sahoo.od@unidistrib.com",     "Biswajit Sahoo",    "9861400001"),
            ("prasanta.mohanty.od@unidistrib.com",   "Prasanta Mohanty",  "9861400002"),
            ("nirmal.patra.od@unidistrib.com",       "Nirmal Patra",      "9861400003"),
            // Haryana
            ("vikas.yadav.hr@unidistrib.com",        "Vikas Yadav",       "9812500001"),
            ("sanjeev.kumar.hr@unidistrib.com",      "Sanjeev Kumar",     "9812500002"),
            ("rohit.malik.hr@unidistrib.com",        "Rohit Malik",       "9812500003"),
            // Jharkhand
            ("rajan.mahto.jh@unidistrib.com",        "Rajan Mahto",       "9835600001"),
            ("suresh.munda.jh@unidistrib.com",       "Suresh Munda",      "9835600002"),
            // Chhattisgarh
            ("ramkumar.sahu.cg@unidistrib.com",      "Ramkumar Sahu",     "9826700001"),
            ("dinesh.yadav.cg@unidistrib.com",       "Dinesh Yadav",      "9826700002"),
            // Assam
            ("dipak.borah.as@unidistrib.com",        "Dipak Borah",       "9435800001"),
            ("bhupen.das.as@unidistrib.com",         "Bhupen Das",        "9435800002"),
            // Uttarakhand
            ("vipin.rawat.uk@unidistrib.com",        "Vipin Rawat",       "9456900001"),
            ("mohan.bisht.uk@unidistrib.com",        "Mohan Bisht",       "9456900002"),
            // Himachal Pradesh
            ("suresh.thakur.hp@unidistrib.com",      "Suresh Thakur",     "9418000001"),
            ("ramesh.sharma.hp@unidistrib.com",      "Ramesh Sharma",     "9418000002"),
            // Goa
            ("mario.fernandes.ga@unidistrib.com",    "Mario Fernandes",   "9823100001"),
            ("anthony.dsouza.ga@unidistrib.com",     "Anthony D'Souza",   "9823100002"),
        };

        var hasher       = new PasswordHasherService();
        var passwordHash = hasher.Hash(agentPassword);

        // Collect existing agent emails to avoid duplicates on re-seed
        var existingEmails = await context.Users
            .Where(u => u.Role == UserRole.DeliveryAgent)
            .Select(u => u.Email)
            .ToHashSetAsync();

        var toAdd = new List<User>();
        foreach (var (email, fullName, phone) in agentData)
        {
            var normalised = email.Trim().ToLowerInvariant();
            if (existingEmails.Contains(normalised))
                continue;

            var user = User.CreateStaff(normalised, passwordHash, fullName, UserRole.DeliveryAgent);
            toAdd.Add(user);
        }

        if (toAdd.Count > 0)
        {
            await context.Users.AddRangeAsync(toAdd);
            await context.SaveChangesAsync();
        }
    }
}
