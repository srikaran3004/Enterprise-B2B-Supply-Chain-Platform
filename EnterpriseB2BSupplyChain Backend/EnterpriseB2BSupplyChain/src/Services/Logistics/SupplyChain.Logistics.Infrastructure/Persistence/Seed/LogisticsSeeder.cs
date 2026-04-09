using Microsoft.EntityFrameworkCore;
using SupplyChain.Logistics.Domain.Entities;

namespace SupplyChain.Logistics.Infrastructure.Persistence.Seed;

public static class LogisticsSeeder
{
    public static async Task SeedAsync(LogisticsDbContext context)
    {
        // Skip if already seeded — idempotent, never wipe real data (shipments, tracking, etc.)
        if (await context.DeliveryAgents.AnyAsync())
            return;

        var agents   = CreateAgents();
        var vehicles = CreateVehicles();

        context.DeliveryAgents.AddRange(agents);
        context.Vehicles.AddRange(vehicles);
        await context.SaveChangesAsync();
    }

    private static List<DeliveryAgent> CreateAgents()
    {
        // Format: (State, FullName, Phone, Email, License, Region)
        // UserId is a stable deterministic GUID per agent so re-seeding is idempotent
        var data = new (string Name, string Phone, string License, string Region)[]
        {
            // Bihar
            ("Rajesh Kumar",      "9123456701", "BR-DL-45821", "Bihar"),
            ("Amit Singh",        "9123456702", "BR-DL-77452", "Bihar"),
            ("Pankaj Yadav",      "9123456703", "BR-DL-99213", "Bihar"),
            ("Sunil Gupta",       "9123456704", "BR-DL-66123", "Bihar"),

            // Maharashtra
            ("Suresh Patil",      "9134567801", "MH-DL-66321", "Maharashtra"),
            ("Ganesh Shinde",     "9134567802", "MH-DL-88452", "Maharashtra"),
            ("Rohan Deshmukh",    "9134567803", "MH-DL-55123", "Maharashtra"),
            ("Ajay Pawar",        "9134567804", "MH-DL-88231", "Maharashtra"),

            // Karnataka
            ("Ravi Kumar",        "9145678901", "KA-DL-33214", "Karnataka"),
            ("Manjunath Gowda",   "9145678902", "KA-DL-77895", "Karnataka"),
            ("Prakash Shetty",    "9145678903", "KA-DL-11987", "Karnataka"),
            ("Harish Naik",       "9145678904", "KA-DL-55678", "Karnataka"),

            // Tamil Nadu
            ("Karthik Reddy",     "9156789001", "TN-DL-44561", "Tamil Nadu"),
            ("Arjun Kumar",       "9156789002", "TN-DL-77812", "Tamil Nadu"),
            ("Vignesh Babu",      "9156789003", "TN-DL-66378", "Tamil Nadu"),

            // Uttar Pradesh
            ("Deepak Sharma",     "9167890101", "UP-DL-55432", "Uttar Pradesh"),
            ("Mohit Verma",       "9167890102", "UP-DL-88211", "Uttar Pradesh"),
            ("Ankit Tiwari",      "9167890103", "UP-DL-99145", "Uttar Pradesh"),

            // Gujarat
            ("Hardik Patel",      "9178901201", "GJ-DL-77123", "Gujarat"),
            ("Jignesh Shah",      "9178901202", "GJ-DL-66214", "Gujarat"),
            ("Kunal Mehta",       "9178901203", "GJ-DL-88345", "Gujarat"),

            // West Bengal
            ("Subhajit Roy",      "9189012301", "WB-DL-55129", "West Bengal"),
            ("Arindam Das",       "9189012302", "WB-DL-77841", "West Bengal"),
            ("Suman Chatterjee",  "9189012303", "WB-DL-66412", "West Bengal"),

            // Rajasthan
            ("Mahendra Singh",    "9190123401", "RJ-DL-77111", "Rajasthan"),
            ("Dinesh Kumar",      "9190123402", "RJ-DL-55234", "Rajasthan"),
            ("Lokesh Meena",      "9190123403", "RJ-DL-88456", "Rajasthan"),

            // Delhi
            ("Arun Sharma",       "9810200001", "DL-DL-20190105", "Delhi"),
            ("Pradeep Gupta",     "9810200002", "DL-DL-20200618", "Delhi"),
            ("Manish Verma",      "9810200003", "DL-DL-20210320", "Delhi"),

            // Telangana
            ("Ravi Teja",         "9848800001", "TS-DL-20190618", "Telangana"),
            ("Srinivas Rao",      "9848800002", "TS-DL-20200425", "Telangana"),
            ("Venkat Reddy",      "9848800003", "TS-DL-20210208", "Telangana"),

            // Kerala
            ("Vishnu Nair",       "9847000001", "KL-DL-20190712", "Kerala"),
            ("Anil Menon",        "9847000002", "KL-DL-20200305", "Kerala"),
            ("Manoj Pillai",      "9847000003", "KL-DL-20210518", "Kerala"),

            // Punjab
            ("Harpreet Singh",    "9815100001", "PB-DL-20190225", "Punjab"),
            ("Gurdeep Kaur",      "9815100002", "PB-DL-20200910", "Punjab"),
            ("Jaspreet Sidhu",    "9815100003", "PB-DL-20210405", "Punjab"),

            // Madhya Pradesh
            ("Ajay Tiwari",       "9826200001", "MP-DL-20190618", "Madhya Pradesh"),
            ("Rahul Jain",        "9826200002", "MP-DL-20200315", "Madhya Pradesh"),
            ("Sandeep Yadav",     "9826200003", "MP-DL-20210720", "Madhya Pradesh"),

            // Andhra Pradesh
            ("Suresh Naidu",      "9866300001", "AP-DL-33201", "Andhra Pradesh"),
            ("Krishna Babu",      "9866300002", "AP-DL-44512", "Andhra Pradesh"),
            ("Ramesh Raju",       "9866300003", "AP-DL-55234", "Andhra Pradesh"),

            // Odisha
            ("Biswajit Sahoo",    "9861400001", "OD-DL-20190812", "Odisha"),
            ("Prasanta Mohanty",  "9861400002", "OD-DL-20200520", "Odisha"),
            ("Nirmal Patra",      "9861400003", "OD-DL-66321", "Odisha"),

            // Haryana
            ("Vikas Yadav",       "9812500001", "HR-DL-44321", "Haryana"),
            ("Sanjeev Kumar",     "9812500002", "HR-DL-55678", "Haryana"),
            ("Rohit Malik",       "9812500003", "HR-DL-66987", "Haryana"),

            // Jharkhand
            ("Rajan Mahto",       "9835600001", "JH-DL-33456", "Jharkhand"),
            ("Suresh Munda",      "9835600002", "JH-DL-44789", "Jharkhand"),

            // Chhattisgarh
            ("Ramkumar Sahu",     "9826700001", "CG-DL-55123", "Chhattisgarh"),
            ("Dinesh Yadav",      "9826700002", "CG-DL-66456", "Chhattisgarh"),

            // Assam
            ("Dipak Borah",       "9435800001", "AS-DL-44321", "Assam"),
            ("Bhupen Das",        "9435800002", "AS-DL-55234", "Assam"),

            // Uttarakhand
            ("Vipin Rawat",       "9456900001", "UK-DL-33123", "Uttarakhand"),
            ("Mohan Bisht",       "9456900002", "UK-DL-44456", "Uttarakhand"),

            // Himachal Pradesh
            ("Suresh Thakur",     "9418000001", "HP-DL-22345", "Himachal Pradesh"),
            ("Ramesh Sharma",     "9418000002", "HP-DL-33678", "Himachal Pradesh"),

            // Goa
            ("Mario Fernandes",   "9823100001", "GA-DL-11234", "Goa"),
            ("Anthony D'Souza",   "9823100002", "GA-DL-22567", "Goa"),
        };

        return data.Select(d =>
            DeliveryAgent.Create(Guid.NewGuid(), d.Name, d.Phone, d.License, d.Region)
        ).ToList();
    }

    private static List<Vehicle> CreateVehicles()
    {
        // Vehicles: Truck, Van, Tempo only (no Bike — loads are large)
        var data = new (string RegNo, string Type, decimal Capacity)[]
        {
            // Bihar
            ("BR01TR4582", "Truck", 8000),
            ("BR02VN7745", "Van",   2000),
            ("BR03TP9921", "Tempo", 1500),
            ("BR04TR6612", "Truck", 8000),

            // Maharashtra
            ("MH01TR6632", "Truck", 8000),
            ("MH02TP8845", "Tempo", 1500),
            ("MH03VN5512", "Van",   2000),
            ("MH04TR8823", "Truck", 8000),

            // Karnataka
            ("KA01VN3321", "Van",   2000),
            ("KA02TR7789", "Truck", 8000),
            ("KA03TP1198", "Tempo", 1500),
            ("KA04TR5567", "Truck", 8000),

            // Tamil Nadu
            ("TN01TP4456", "Tempo", 1500),
            ("TN02VN7781", "Van",   2000),
            ("TN03TR6637", "Truck", 8000),

            // Uttar Pradesh
            ("UP01TR5543", "Truck", 8000),
            ("UP02VN8821", "Van",   2000),
            ("UP03TP9914", "Tempo", 1500),

            // Gujarat
            ("GJ01TP7712", "Tempo", 1500),
            ("GJ02TR6621", "Truck", 8000),
            ("GJ03VN8834", "Van",   2000),

            // West Bengal
            ("WB01VN5512", "Van",   2000),
            ("WB02TR7784", "Truck", 8000),
            ("WB03TP6641", "Tempo", 1500),

            // Rajasthan
            ("RJ01TR7711", "Truck", 8000),
            ("RJ02TP5523", "Tempo", 1500),
            ("RJ03VN8845", "Van",   2000),

            // Delhi
            ("DL01TR2201", "Truck", 8000),
            ("DL02VN4412", "Van",   2000),
            ("DL03TP6623", "Tempo", 1500),

            // Telangana
            ("TS01TR3301", "Truck", 8000),
            ("TS02VN5512", "Van",   2000),
            ("TS03TP7723", "Tempo", 1500),

            // Kerala
            ("KL01TR1101", "Truck", 8000),
            ("KL02VN2202", "Van",   2000),
            ("KL03TP3303", "Tempo", 1500),

            // Punjab
            ("PB01TR5501", "Truck", 8000),
            ("PB02VN6602", "Van",   2000),
            ("PB03TP7703", "Tempo", 1500),

            // Madhya Pradesh
            ("MP01TR4401", "Truck", 8000),
            ("MP02VN5502", "Van",   2000),
            ("MP03TP6603", "Tempo", 1500),

            // Andhra Pradesh
            ("AP01TR2201", "Truck", 8000),
            ("AP02VN3302", "Van",   2000),
            ("AP03TP4403", "Tempo", 1500),

            // Odisha
            ("OD01TR3301", "Truck", 8000),
            ("OD02VN4402", "Van",   2000),
            ("OD03TP5503", "Tempo", 1500),

            // Haryana
            ("HR01TR6601", "Truck", 8000),
            ("HR02VN7702", "Van",   2000),
            ("HR03TP8803", "Tempo", 1500),

            // Jharkhand
            ("JH01TR1101", "Truck", 8000),
            ("JH02VN2202", "Van",   2000),

            // Chhattisgarh
            ("CG01TR3301", "Truck", 8000),
            ("CG02VN4402", "Van",   2000),

            // Assam
            ("AS01TR5501", "Truck", 8000),
            ("AS02VN6602", "Van",   2000),

            // Uttarakhand
            ("UK01TR7701", "Truck", 8000),
            ("UK02VN8802", "Van",   2000),

            // Himachal Pradesh
            ("HP01TR9901", "Truck", 8000),
            ("HP02VN1002", "Van",   2000),

            // Goa
            ("GA01TR2201", "Truck", 8000),
            ("GA02VN3302", "Van",   2000),
        };

        return data.Select(d =>
            Vehicle.Create(d.RegNo, d.Type, d.Capacity)
        ).ToList();
    }
}
