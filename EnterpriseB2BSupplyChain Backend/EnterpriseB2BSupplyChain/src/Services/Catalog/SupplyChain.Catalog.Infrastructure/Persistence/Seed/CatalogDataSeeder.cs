using Microsoft.EntityFrameworkCore;
using SupplyChain.Catalog.Domain.Entities;

namespace SupplyChain.Catalog.Infrastructure.Persistence.Seed;

public static class CatalogDataSeeder
{
    public static async Task SeedAsync(CatalogDbContext context)
    {
        if (await context.Categories.AnyAsync())
            return;

        // ── 11 flat top-level categories ────────────────────────────────────
        var hairCare        = Category.Create("Hair Care",                "Shampoos, conditioners, oils and hair treatments");
        var skinCare        = Category.Create("Skin Care",                "Face creams, body lotions and skincare");
        var soapsBodyWash   = Category.Create("Soaps & Body Wash",        "Bar soaps and shower gels");
        var oralCare        = Category.Create("Oral Care",                "Toothpastes and mouthwash");
        var deodorants      = Category.Create("Deodorants",               "Deodorants and body sprays");
        var fabricCare      = Category.Create("Fabric Care",              "Detergents and fabric softeners");
        var householdCare   = Category.Create("Household Care",           "Kitchen, surface and toilet cleaners");
        var tea             = Category.Create("Tea",                      "Premium and everyday tea brands");
        var coffee          = Category.Create("Coffee",                   "Instant coffee and coffee mixes");
        var condimentsFoods = Category.Create("Condiments & Foods",       "Sauces, spreads, soups and seasonings");
        var nutritionHealth = Category.Create("Nutrition & Health Drinks","Health drinks and nutritional supplements");

        var allCategories = new[]
        {
            hairCare, skinCare, soapsBodyWash, oralCare, deodorants,
            fabricCare, householdCare, tea, coffee, condimentsFoods, nutritionHealth
        };

        context.Categories.AddRange(allCategories);

        // Product.Create signature:
        // (string sku, string name, string? description, string? brand,
        //  Guid categoryId, decimal unitPrice, int minOrderQuantity, int initialStock, string? imageUrl = null)

        var products = new List<Product>
        {
            // ── Hair Care (9 products) ────────────────────────────────────
            Product.Create("DOVE-SHP-340",  "Dove Intense Repair Shampoo 340ml",        null, "Dove",           hairCare.CategoryId,  149m, 1, 500),
            Product.Create("DOVE-CON-175",  "Dove Daily Shine Conditioner 175ml",       null, "Dove",           hairCare.CategoryId,  110m, 1, 400),
            Product.Create("SUN-SHP-360",   "Sunsilk Lusciously Thick Shampoo 360ml",   null, "Sunsilk",        hairCare.CategoryId,  130m, 1, 600),
            Product.Create("SUN-SHP-200",   "Sunsilk Smooth & Manageable Shampoo 200ml",null, "Sunsilk",        hairCare.CategoryId,   80m, 1, 700),
            Product.Create("TRES-SHP-580",  "TRESemmé Keratin Smooth Shampoo 580ml",    null, "TRESemmé",       hairCare.CategoryId,  299m, 1, 300),
            Product.Create("CLNC-SHP-340",  "Clinic Plus Strong & Long Shampoo 340ml",  null, "Clinic Plus",    hairCare.CategoryId,   99m, 1, 800),
            Product.Create("IND-OIL-100",   "Indulekha Bringha Hair Oil 100ml",         null, "Indulekha",      hairCare.CategoryId,  349m, 1, 250),
            Product.Create("CLR-SHP-340",   "CLEAR Ice Cool Menthol Shampoo 340ml",     null, "CLEAR",          hairCare.CategoryId,  165m, 1, 350),
            Product.Create("TRES-SPR-200",  "TRESemmé Salon Finish Hair Spray 200ml",   null, "TRESemmé",       hairCare.CategoryId,  249m, 1, 200),

            // ── Skin Care (8 products) ────────────────────────────────────
            Product.Create("POND-MOI-75",   "Pond's Light Moisturiser 75ml",                        null, "Pond's",          skinCare.CategoryId, 149m, 1, 600),
            Product.Create("POND-SRM-23",   "Pond's Bright Beauty Serum Cream 23g",                 null, "Pond's",          skinCare.CategoryId, 129m, 1, 500),
            Product.Create("VAS-LOT-400",   "Vaseline Intensive Care Body Lotion 400ml",             null, "Vaseline",        skinCare.CategoryId, 199m, 1, 700),
            Product.Create("VAS-WHT-300",   "Vaseline Healthy White SPF 24 Lotion 300ml",            null, "Vaseline",        skinCare.CategoryId, 179m, 1, 650),
            Product.Create("GL-CRM-80",     "Glow & Lovely Advanced Multivitamin Cream 80g",         null, "Glow & Lovely",   skinCare.CategoryId, 149m, 1, 900),
            Product.Create("SIM-MOI-125",   "Simple Kind to Skin Moisturiser 125ml",                 null, "Simple",          skinCare.CategoryId, 299m, 1, 300),
            Product.Create("GH-CRM-50",     "Glow & Handsome Instant Brightness Cream 50g",          null, "Glow & Handsome", skinCare.CategoryId, 149m, 1, 400),
            Product.Create("POND-AMC-50",   "Pond's Age Miracle Cell Regen Day Cream 50g",           null, "Pond's",          skinCare.CategoryId, 549m, 1, 200),

            // ── Soaps & Body Wash (8 products) ───────────────────────────
            Product.Create("LUX-BAR-150",   "Lux Velvet Touch Soap Bar 150g",            null, "Lux",       soapsBodyWash.CategoryId,  40m, 1, 1200),
            Product.Create("LUX-BAR-100",   "Lux Creamy Perfection Soap Bar 100g",       null, "Lux",       soapsBodyWash.CategoryId,  27m, 1, 1500),
            Product.Create("DOVE-BAR-100",  "Dove Cream Beauty Bathing Bar 100g",        null, "Dove",      soapsBodyWash.CategoryId,  55m, 1,  900),
            Product.Create("DOVE-BW-250",   "Dove Go Fresh Body Wash 250ml",             null, "Dove",      soapsBodyWash.CategoryId, 199m, 1,  500),
            Product.Create("LFB-BAR-125",   "Lifebuoy Total 10 Germ Protection Soap 125g",null,"Lifebuoy",  soapsBodyWash.CategoryId,  38m, 1, 1000),
            Product.Create("PRS-BAR-125",   "Pears Pure & Gentle Soap 125g",             null, "Pears",     soapsBodyWash.CategoryId,  48m, 1,  800),
            Product.Create("HAM-BAR-150",   "Hamam Neem Tulsi & Aloe Soap 150g",         null, "Hamam",     soapsBodyWash.CategoryId,  36m, 1,  700),
            Product.Create("MOT-BAR-150",   "Moti Rose Soap 150g",                       null, "Moti",      soapsBodyWash.CategoryId,  35m, 1,  600),

            // ── Oral Care (6 products) ────────────────────────────────────
            Product.Create("CLU-TP-200",    "Closeup Ever Fresh+ Toothpaste 200g",       null, "Closeup",   oralCare.CategoryId,  95m, 1,  800),
            Product.Create("CLU-TP-150",    "Closeup Red Hot Toothpaste 150g",           null, "Closeup",   oralCare.CategoryId,  70m, 1,  900),
            Product.Create("PEP-TP-200",    "Pepsodent Germicheck Toothpaste 200g",      null, "Pepsodent", oralCare.CategoryId,  85m, 1,  750),
            Product.Create("PEP-SEN-80",    "Pepsodent Sensitive Expert Toothpaste 80g", null, "Pepsodent", oralCare.CategoryId,  99m, 1,  500),
            Product.Create("CLU-DIA-150",   "Closeup Diamond Attraction Toothpaste 150g",null, "Closeup",   oralCare.CategoryId,  85m, 1,  600),
            Product.Create("PEP-WHT-140",   "Pepsodent Whitening Toothpaste 140g",       null, "Pepsodent", oralCare.CategoryId,  80m, 1,  550),

            // ── Deodorants (7 products) ───────────────────────────────────
            Product.Create("AXE-DEO-150",   "Axe Dark Temptation Deo Spray 150ml",       null, "Axe",    deodorants.CategoryId, 199m, 1, 500),
            Product.Create("AXE-GLD-150",   "Axe Gold Temptation Deo Spray 150ml",       null, "Axe",    deodorants.CategoryId, 199m, 1, 450),
            Product.Create("AXE-ICE-150",   "Axe Ice Chill Deo Spray 150ml",             null, "Axe",    deodorants.CategoryId, 199m, 1, 400),
            Product.Create("REX-MEN-150",   "Rexona Men Active Deo Spray 150ml",         null, "Rexona",  deodorants.CategoryId, 179m, 1, 600),
            Product.Create("REX-WOM-150",   "Rexona Women Cotton Dry Deo Spray 150ml",   null, "Rexona",  deodorants.CategoryId, 179m, 1, 550),
            Product.Create("REX-STK-40",    "Rexona Men Xtracool Deo Stick 40g",         null, "Rexona",  deodorants.CategoryId, 149m, 1, 300),
            Product.Create("AXE-STK-50",    "Axe Signature Deo Stick 50g",               null, "Axe",    deodorants.CategoryId, 175m, 1, 250),

            // ── Fabric Care (7 products) ──────────────────────────────────
            Product.Create("SRF-PWD-1KG",   "Surf Excel Easy Wash Detergent Powder 1kg",  null, "Surf Excel",   fabricCare.CategoryId,  99m, 1, 1000),
            Product.Create("SRF-PWD-3KG",   "Surf Excel Easy Wash Detergent Powder 3kg",  null, "Surf Excel",   fabricCare.CategoryId, 280m, 1,  600),
            Product.Create("SRF-LIQ-1L",    "Surf Excel Matic Liquid 1L",                 null, "Surf Excel",   fabricCare.CategoryId, 299m, 1,  400),
            Product.Create("RIN-PWD-1KG",   "Rin Advanced Powder 1kg",                    null, "Rin",          fabricCare.CategoryId,  75m, 1,  900),
            Product.Create("WHL-PWD-1KG",   "Active Wheel Fresh Lemon Powder 1kg",        null, "Active Wheel", fabricCare.CategoryId,  55m, 1, 1200),
            Product.Create("CMF-FAB-840",   "Comfort After Wash Fabric Conditioner 840ml",null, "Comfort",      fabricCare.CategoryId, 199m, 1,  500),
            Product.Create("CMF-FAB-210",   "Comfort Morning Fresh Fabric Conditioner 210ml",null,"Comfort",    fabricCare.CategoryId,  75m, 1,  800),

            // ── Household Care (7 products) ───────────────────────────────
            Product.Create("VIM-LIQ-750",   "Vim Dishwash Liquid Lemon 750ml",           null, "Vim",    householdCare.CategoryId,  85m, 1,  900),
            Product.Create("VIM-BAR-200",   "Vim Dishwash Bar 200g",                     null, "Vim",    householdCare.CategoryId,  22m, 1, 1500),
            Product.Create("VIM-PWD-500",   "Vim Dishwash Powder 500g",                  null, "Vim",    householdCare.CategoryId,  48m, 1,  700),
            Product.Create("DMX-TCL-500",   "Domex Toilet Cleaner Original 500ml",       null, "Domex",  householdCare.CategoryId,  85m, 1,  800),
            Product.Create("DMX-FLR-1L",    "Domex Floor Cleaner Fresh Blue 1L",         null, "Domex",  householdCare.CategoryId, 115m, 1,  600),
            Product.Create("CIF-CRM-500",   "Cif Cream Surface Cleaner 500ml",           null, "Cif",    householdCare.CategoryId, 129m, 1,  400),
            Product.Create("CIF-SPR-700",   "Cif Bathroom Spray 700ml",                  null, "Cif",    householdCare.CategoryId, 149m, 1,  350),

            // ── Tea (8 products) ──────────────────────────────────────────
            Product.Create("BB-RL-500",     "Brooke Bond Red Label Natural Care Tea 500g", null, "Brooke Bond", tea.CategoryId, 225m, 1, 800),
            Product.Create("BB-RL-1KG",     "Brooke Bond Red Label Tea 1kg",               null, "Brooke Bond", tea.CategoryId, 430m, 1, 500),
            Product.Create("BB-TZ-500",     "Brooke Bond Taaza Tea 500g",                  null, "Brooke Bond", tea.CategoryId, 185m, 1, 700),
            Product.Create("BB-3R-500",     "Brooke Bond 3 Roses Tea 500g",                null, "Brooke Bond", tea.CategoryId, 195m, 1, 600),
            Product.Create("TM-TB-100",     "Taj Mahal Tea Bags 100 pcs",                  null, "Taj Mahal",   tea.CategoryId, 249m, 1, 450),
            Product.Create("TM-LT-500",     "Taj Mahal Premium Loose Tea 500g",            null, "Taj Mahal",   tea.CategoryId, 299m, 1, 400),
            Product.Create("LIP-TB-100",    "Lipton Yellow Label Tea Bags 100 pcs",        null, "Lipton",      tea.CategoryId, 199m, 1, 500),
            Product.Create("LIP-GT-25",     "Lipton Green Tea Bags 25 pcs",               null, "Lipton",      tea.CategoryId, 125m, 1, 600),

            // ── Coffee (7 products) ───────────────────────────────────────
            Product.Create("BRU-INS-200",   "Bru Instant Coffee 200g",                   null, "Bru", coffee.CategoryId, 249m, 1, 600),
            Product.Create("BRU-INS-50",    "Bru Instant Coffee 50g",                    null, "Bru", coffee.CategoryId,  75m, 1,1000),
            Product.Create("BRU-GLD-100",   "Bru Gold Freeze Dried Coffee 100g",         null, "Bru", coffee.CategoryId, 349m, 1, 400),
            Product.Create("BRU-GRN-500",   "Bru Green Label Filter Coffee 500g",        null, "Bru", coffee.CategoryId, 299m, 1, 350),
            Product.Create("BRU-RGD-200",   "Bru Roasted & Ground Coffee 200g",          null, "Bru", coffee.CategoryId, 199m, 1, 450),
            Product.Create("BRU-CAP-15",    "Bru Cappuccino Sachet 15 pcs",              null, "Bru", coffee.CategoryId, 149m, 1, 500),
            Product.Create("BRU-MOC-15",    "Bru Mocha Sachet 15 pcs",                   null, "Bru", coffee.CategoryId, 149m, 1, 450),

            // ── Condiments & Foods (7 products) ──────────────────────────
            Product.Create("KIS-JAM-500",   "Kissan Mixed Fruit Jam 500g",               null, "Kissan",     condimentsFoods.CategoryId, 130m, 1, 700),
            Product.Create("KIS-SQS-750",   "Kissan Orange Squash 750ml",                null, "Kissan",     condimentsFoods.CategoryId, 120m, 1, 600),
            Product.Create("KIS-KET-1KG",   "Kissan Fresh Tomato Ketchup 1kg",           null, "Kissan",     condimentsFoods.CategoryId, 175m, 1, 800),
            Product.Create("KNR-SOP-44",    "Knorr Classic Tomato Soup 44g",             null, "Knorr",      condimentsFoods.CategoryId,  35m, 1,1500),
            Product.Create("KNR-CNS-44",    "Knorr Chicken Noodle Soup 44g",             null, "Knorr",      condimentsFoods.CategoryId,  40m, 1,1200),
            Product.Create("KNR-SFR-55",    "Knorr Schezwan Fried Rice Masala 55g",      null, "Knorr",      condimentsFoods.CategoryId,  50m, 1,1000),
            Product.Create("HLM-MAY-400",   "Hellmann's Real Mayonnaise 400g",           null, "Hellmann's", condimentsFoods.CategoryId, 199m, 1, 400),

            // ── Nutrition & Health Drinks (7 products) ───────────────────
            Product.Create("HOR-CLM-500",   "Horlicks Classic Malt 500g",                null, "Horlicks", nutritionHealth.CategoryId, 235m, 1, 700),
            Product.Create("HOR-CLM-1KG",   "Horlicks Classic Malt 1kg",                 null, "Horlicks", nutritionHealth.CategoryId, 430m, 1, 400),
            Product.Create("HOR-WOM-400",   "Horlicks Women's Plus Vanilla 400g",        null, "Horlicks", nutritionHealth.CategoryId, 299m, 1, 350),
            Product.Create("HOR-GRW-400",   "Horlicks Growth+ Vanilla 400g",             null, "Horlicks", nutritionHealth.CategoryId, 449m, 1, 250),
            Product.Create("BOO-CHO-500",   "Boost Chocolate Malt Drink 500g",           null, "Boost",    nutritionHealth.CategoryId, 265m, 1, 600),
            Product.Create("BOO-CHO-1KG",   "Boost Chocolate Malt Drink 1kg",            null, "Boost",    nutritionHealth.CategoryId, 499m, 1, 350),
            Product.Create("BOO-ACT-500",   "Boost Activ Jar 500g",                      null, "Boost",    nutritionHealth.CategoryId, 299m, 1, 400),
        };

        context.Products.AddRange(products);

        await context.SaveChangesAsync();
    }
}
