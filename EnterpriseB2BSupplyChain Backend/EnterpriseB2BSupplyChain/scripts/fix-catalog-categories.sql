SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Merge duplicate/variant categories into canonical categories while preserving product links.
DECLARE @MergeMap TABLE (
    SourceCategoryId UNIQUEIDENTIFIER NOT NULL,
    TargetCategoryId UNIQUEIDENTIFIER NOT NULL
);

INSERT INTO @MergeMap (SourceCategoryId, TargetCategoryId)
VALUES
    ('75329003-4279-45F8-AF0B-52D787F491A1', '90D2261C-A296-4CDC-99E0-EA17E852F0A3'), -- BEAUTY & WELLBEING — HAIR CARE -> Hair Care
    ('750163B9-8B92-47E4-812E-6632A5E6721E', '073BF8E0-6A1F-40FC-BF2E-F915CA98D020'), -- BEAUTY & WELLBEING — SKIN CARE... -> Skin Care
    ('9CBACE2F-5AC6-4F44-B09F-349ED7A6FD76', '16B10785-4294-47A5-A92F-960AD22FE250'), -- PERSONAL CARE — DEODORANTS -> Deodorants
    ('4BC86BCA-79AF-4B0E-8C40-FC29FC229B73', '32DEAC67-08AB-4FBE-B363-A7C734D3A95B'), -- PERSONAL CARE — ORAL CARE -> Oral Care
    ('2FACBC57-9588-4D4D-BDF1-38475777CC37', '380806C4-2875-4F06-86F8-C38E68CB9C6B'), -- Cleaning -> Household Care
    ('F73DD579-691D-4ADC-84E6-1DC6FD8B2C38', 'E9EA6383-1414-45FA-A595-C990AE462A76'), -- Laundry -> Fabric Care
    ('F2DA836F-4C24-4A28-BAAC-3DCE7FE3BB86', '6F24088E-4728-4251-B85B-985259991875'), -- Foods- Beverages -> Beverages
    ('DD281F1B-D104-4030-A3D5-C4D17573B048', '6F24088E-4728-4251-B85B-985259991875'); -- Foods-Beverages -> Beverages

-- Re-map products to target categories.
UPDATE p
SET p.CategoryId = m.TargetCategoryId
FROM Products p
INNER JOIN @MergeMap m ON p.CategoryId = m.SourceCategoryId;

-- Re-map parent-child relationships.
UPDATE c
SET c.ParentCategoryId = m.TargetCategoryId
FROM Categories c
INNER JOIN @MergeMap m ON c.ParentCategoryId = m.SourceCategoryId;

-- Delete merged source categories.
DELETE c
FROM Categories c
INNER JOIN @MergeMap m ON c.CategoryId = m.SourceCategoryId;

-- Normalize canonical names/descriptions.
UPDATE Categories
SET Name = 'Hair Care',
    Description = 'Shampoos, conditioners, and hair treatments'
WHERE CategoryId = '90D2261C-A296-4CDC-99E0-EA17E852F0A3';

UPDATE Categories
SET Name = 'Skin Care',
    Description = 'Face and body skincare'
WHERE CategoryId = '073BF8E0-6A1F-40FC-BF2E-F915CA98D020';

UPDATE Categories
SET Name = 'Skin Cleansing & Soaps',
    Description = 'Body cleansing bars, soaps, and washes'
WHERE CategoryId = '8BCF49E7-CF88-428E-9CDD-0A28C88D4307';

UPDATE Categories
SET Name = 'Oral Care',
    Description = 'Toothpastes and mouthwash'
WHERE CategoryId = '32DEAC67-08AB-4FBE-B363-A7C734D3A95B';

UPDATE Categories
SET Name = 'Deodorants',
    Description = 'Deodorants and body sprays'
WHERE CategoryId = '16B10785-4294-47A5-A92F-960AD22FE250';

UPDATE Categories
SET Name = 'Beverages',
    Description = 'Tea, coffee, and packaged beverages'
WHERE CategoryId = '6F24088E-4728-4251-B85B-985259991875';

UPDATE Categories
SET Name = 'Nutrition & Health Drinks',
    Description = 'Nutrition and health drink products'
WHERE CategoryId = '77FB2258-A039-4B10-8E5F-086F4BBCF26E';

UPDATE Categories
SET Name = 'Food Category',
    Description = 'Condiments and packaged foods'
WHERE CategoryId = '31E87BE4-5624-4A0B-8D37-0B6FAE9842FD';

UPDATE Categories
SET Name = 'Fabric Care',
    Description = 'Laundry and fabric care products'
WHERE CategoryId = 'E9EA6383-1414-45FA-A595-C990AE462A76';

UPDATE Categories
SET Name = 'Household Care',
    Description = 'Surface, kitchen, and household cleaning products'
WHERE CategoryId = '380806C4-2875-4F06-86F8-C38E68CB9C6B';

-- Remove empty placeholder category if it has no products.
DELETE FROM Categories
WHERE CategoryId = 'ED5B8F6C-42B6-4306-8FC3-27861E21E626'
  AND NOT EXISTS (SELECT 1 FROM Products p WHERE p.CategoryId = 'ED5B8F6C-42B6-4306-8FC3-27861E21E626')
  AND NOT EXISTS (SELECT 1 FROM Categories c WHERE c.ParentCategoryId = 'ED5B8F6C-42B6-4306-8FC3-27861E21E626');

COMMIT TRANSACTION;

-- Validation output
SELECT c.CategoryId, c.Name, c.ParentCategoryId, c.IsActive, COUNT(p.ProductId) AS ProductCount
FROM Categories c
LEFT JOIN Products p ON p.CategoryId = c.CategoryId
GROUP BY c.CategoryId, c.Name, c.ParentCategoryId, c.IsActive
ORDER BY c.Name;
