scripts/db/seeds/brands.sql
-- Insert brand data for Xarastore
-- Brands are admin-configurable via admin dashboard

INSERT INTO public.brands (id, slug, name, description, logo, product_count, created_at, updated_at) VALUES
-- Electronics Brands
(
    'bb0e8400-e29b-41d4-a716-446655440001',
    'apple',
    'Apple',
    'Apple Inc. is an American multinational technology company that designs, develops, and sells consumer electronics, computer software, and online services.',
    'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440002',
    'samsung',
    'Samsung',
    'Samsung is a South Korean multinational manufacturing conglomerate headquartered in Samsung Town, Seoul.',
    'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440003',
    'sony',
    'Sony',
    'Sony Corporation is a Japanese multinational conglomerate corporation headquartered in Kōnan, Minato, Tokyo.',
    'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440004',
    'lg',
    'LG',
    'LG Corporation is a South Korean multinational conglomerate corporation.',
    'https://upload.wikimedia.org/wikipedia/commons/2/20/LG_symbol.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440005',
    'microsoft',
    'Microsoft',
    'Microsoft Corporation is an American multinational technology corporation which produces computer software, consumer electronics, personal computers, and related services.',
    'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440006',
    'dell',
    'Dell',
    'Dell Technologies Inc. is an American multinational technology company that develops, sells, repairs, and supports computers and related products and services.',
    'https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440007',
    'hp',
    'HP',
    'HP Inc. is an American multinational information technology company that develops personal computers, printers, and related supplies.',
    'https://upload.wikimedia.org/wikipedia/commons/2/29/HP_New_Logo_2D.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440008',
    'lenovo',
    'Lenovo',
    'Lenovo Group Limited, often shortened to Lenovo, is a Chinese multinational technology company specializing in designing, manufacturing, and marketing consumer electronics.',
    'https://upload.wikimedia.org/wikipedia/commons/c/c7/Lenovo_logo_2015.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440009',
    'asus',
    'ASUS',
    'ASUSTeK Computer Inc. is a Taiwanese multinational computer and phone hardware and electronics company headquartered in Beitou District, Taipei, Taiwan.',
    'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440010',
    'acer',
    'Acer',
    'Acer Inc. is a Taiwanese multinational hardware and electronics corporation specializing in advanced electronics technology.',
    'https://upload.wikimedia.org/wikipedia/commons/0/00/Acer_Logo.svg',
    0,
    NOW(),
    NOW()
),
-- Fashion Brands
(
    'bb0e8400-e29b-41d4-a716-446655440011',
    'nike',
    'Nike',
    'Nike, Inc. is an American multinational corporation that is engaged in the design, development, manufacturing, and worldwide marketing and sales of footwear, apparel, equipment, accessories, and services.',
    'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440012',
    'adidas',
    'Adidas',
    'Adidas AG is a German multinational corporation, founded and headquartered in Herzogenaurach, Germany, that designs and manufactures shoes, clothing and accessories.',
    'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440013',
    'puma',
    'Puma',
    'Puma SE, branded as Puma, is a German multinational corporation that designs and manufactures athletic and casual footwear, apparel and accessories.',
    'https://upload.wikimedia.org/wikipedia/commons/3/36/Puma_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440014',
    'levis',
    'Levis',
    'Levi Strauss & Co. is an American clothing company known worldwide for its Levi''s brand of denim jeans.',
    'https://upload.wikimedia.org/wikipedia/commons/7/79/Levi_Strauss_%26_Co._logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440015',
    'gucci',
    'Gucci',
    'Gucci is an Italian high-end luxury fashion house based in Florence, Italy.',
    'https://upload.wikimedia.org/wikipedia/commons/7/75/Gucci_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440016',
    'zara',
    'Zara',
    'Zara is a Spanish apparel retailer based in Arteixo, Galicia, Spain. It is the flagship chain store of the Inditex group.',
    'https://upload.wikimedia.org/wikipedia/commons/f/fd/Zara_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440017',
    'h&m',
    'H&M',
    'H & M Hennes & Mauritz AB is a Swedish multinational clothing-retail company known for its fast-fashion clothing for men, women, teenagers and children.',
    'https://upload.wikimedia.org/wikipedia/commons/5/53/H%26M-Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440018',
    'uniqlo',
    'Uniqlo',
    'Uniqlo Co., Ltd. is a Japanese casual wear designer, manufacturer and retailer.',
    'https://upload.wikimedia.org/wikipedia/commons/9/92/UNIQLO_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440019',
    'tommy-hilfiger',
    'Tommy Hilfiger',
    'Tommy Hilfiger is an American fashion designer and the founder of Tommy Hilfiger Corporation.',
    'https://upload.wikimedia.org/wikipedia/commons/4/44/Tommy_Hilfiger_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440020',
    'calvin-klein',
    'Calvin Klein',
    'Calvin Klein Inc. is an American fashion house established in 1968 by Calvin Klein.',
    'https://upload.wikimedia.org/wikipedia/commons/7/7d/Calvin_Klein_logo.svg',
    0,
    NOW(),
    NOW()
),
-- Home & Kitchen Brands
(
    'bb0e8400-e29b-41d4-a716-446655440021',
    'ikea',
    'IKEA',
    'IKEA is a Swedish multinational conglomerate that designs and sells ready-to-assemble furniture, kitchen appliances and home accessories.',
    'https://upload.wikimedia.org/wikipedia/commons/c/c0/Ikea_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440022',
    'dyson',
    'Dyson',
    'Dyson Ltd is a British technology company that designs and manufactures household appliances such as vacuum cleaners, air purifiers, hand dryers, bladeless fans, heaters, hair dryers, and lights.',
    'https://upload.wikimedia.org/wikipedia/commons/9/9b/Dyson_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440023',
    'instant-pot',
    'Instant Pot',
    'Instant Pot is a brand of multicookers manufactured by Instant Brands. The multicookers are electronically controlled, combined pressure cookers and slow cookers.',
    'https://upload.wikimedia.org/wikipedia/commons/7/71/Instant_Pot_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440024',
    'kitchenaid',
    'KitchenAid',
    'KitchenAid is an American home appliance brand owned by Whirlpool Corporation.',
    'https://upload.wikimedia.org/wikipedia/commons/8/8a/KitchenAid_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440025',
    'ninja',
    'Ninja',
    'Ninja is a brand of kitchen appliances owned by SharkNinja, a subsidiary of Hong Kong-based JS Global Lifestyle.',
    'https://upload.wikimedia.org/wikipedia/commons/4/44/Ninja_kitchen_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440026',
    'philips',
    'Philips',
    'Philips is a Dutch multinational conglomerate corporation that was founded in Eindhoven in 1891.',
    'https://upload.wikimedia.org/wikipedia/commons/5/5e/Philips_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440027',
    'bosch',
    'Bosch',
    'Robert Bosch GmbH is a German multinational engineering and technology company headquartered in Gerlingen, Germany.',
    'https://upload.wikimedia.org/wikipedia/commons/4/4e/Bosch-logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440028',
    'black+decker',
    'Black+Decker',
    'Black+Decker is an American manufacturer of power tools, accessories, hardware, home improvement products, and technology-based fastening systems.',
    'https://upload.wikimedia.org/wikipedia/commons/4/4a/Black_%26_Decker_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440029',
    'whirlpool',
    'Whirlpool',
    'Whirlpool Corporation is an American multinational manufacturer and marketer of home appliances, headquartered in Benton Charter Township, Michigan.',
    'https://upload.wikimedia.org/wikipedia/commons/1/1a/Whirlpool_Corporation_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440030',
    'sealy',
    'Sealy',
    'Sealy Corporation is a manufacturer of mattresses and bedding products. It is a subsidiary of Tempur Sealy International.',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/Sealy_Corporation_logo.svg',
    0,
    NOW(),
    NOW()
),
-- Beauty Brands
(
    'bb0e8400-e29b-41d4-a716-446655440031',
    'loreal',
    'L''Oreal',
    'L''Oréal S.A. is a French personal care company headquartered in Clichy, Hauts-de-Seine with a registered office in Paris.',
    'https://upload.wikimedia.org/wikipedia/commons/8/8c/L%27Or%C3%A9al_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440032',
    'estee-lauder',
    'Estée Lauder',
    'Estée Lauder Companies Inc. is an American multinational manufacturer and marketer of prestige skincare, makeup, fragrance and hair care products.',
    'https://upload.wikimedia.org/wikipedia/commons/4/46/Est%C3%A9e_Lauder_Companies_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440033',
    'maybelline',
    'Maybelline',
    'Maybelline is an American multinational cosmetics, skin care, perfume, and personal care company, based in New York City.',
    'https://upload.wikimedia.org/wikipedia/commons/7/7e/Maybelline_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440034',
    'revlon',
    'Revlon',
    'Revlon, Inc. is an American multinational cosmetics, skin care, fragrance, and personal care company founded in 1932.',
    'https://upload.wikimedia.org/wikipedia/commons/6/68/Revlon_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440035',
    'neutrogena',
    'Neutrogena',
    'Neutrogena is an American brand of skin care, hair care and cosmetics owned by Kenvue, headquartered in Los Angeles, California.',
    'https://upload.wikimedia.org/wikipedia/commons/0/0d/Neutrogena_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440036',
    'nivea',
    'Nivea',
    'Nivea is a German personal care brand that specializes in skin and body care.',
    'https://upload.wikimedia.org/wikipedia/commons/7/73/NIVEA_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440037',
    'dove',
    'Dove',
    'Dove is a personal care brand owned by Unilever originating in the United Kingdom.',
    'https://upload.wikimedia.org/wikipedia/commons/7/71/Dove_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440038',
    'olay',
    'Olay',
    'Olay is an American skin care brand, owned by Procter & Gamble since 1985.',
    'https://upload.wikimedia.org/wikipedia/commons/6/6c/Olay_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440039',
    'garnier',
    'Garnier',
    'Garnier is a mass market cosmetics brand of L''Oréal that produces hair care and skin care products.',
    'https://upload.wikimedia.org/wikipedia/commons/0/06/Garnier_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440040',
    'vaseline',
    'Vaseline',
    'Vaseline is an American brand of petroleum jelly-based products owned by Unilever.',
    'https://upload.wikimedia.org/wikipedia/commons/4/48/Vaseline_logo.svg',
    0,
    NOW(),
    NOW()
),
-- Sports & Outdoors Brands
(
    'bb0e8400-e29b-41d4-a716-446655440041',
    'fitbit',
    'Fitbit',
    'Fitbit is an American company that produces activity trackers, wireless-enabled wearable technology devices that measure data such as the number of steps walked, heart rate, quality of sleep, steps climbed, and other personal metrics.',
    'https://upload.wikimedia.org/wikipedia/commons/9/9e/Fitbit_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440042',
    'garmin',
    'Garmin',
    'Garmin Ltd. is an American multinational technology company founded in 1989 by Gary Burrell and Min Kao in Lenexa, Kansas, United States.',
    'https://upload.wikimedia.org/wikipedia/commons/9/91/Garmin_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440043',
    'under-armour',
    'Under Armour',
    'Under Armour, Inc. is an American company that manufactures footwear, sports and casual apparel.',
    'https://upload.wikimedia.org/wikipedia/commons/3/36/Under_Armour_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440044',
    'columbia',
    'Columbia',
    'Columbia Sportswear Company is an American company that manufactures and distributes outerwear, sportswear, and footwear, as well as headgear, camping equipment, ski apparel, and outerwear accessories.',
    'https://upload.wikimedia.org/wikipedia/commons/8/8a/Columbia_Sportswear_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440045',
    'the-north-face',
    'The North Face',
    'The North Face is an American outdoor recreation products company. The North Face produces apparel, footwear, and equipment.',
    'https://upload.wikimedia.org/wikipedia/commons/5/53/The_North_Face_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440046',
    'patagonia',
    'Patagonia',
    'Patagonia, Inc. is an American clothing company that markets and sells outdoor clothing.',
    'https://upload.wikimedia.org/wikipedia/commons/6/6d/Patagonia_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440047',
    'reebok',
    'Reebok',
    'Reebok is an American fitness footwear and clothing brand that is a part of Authentic Brands Group.',
    'https://upload.wikimedia.org/wikipedia/commons/0/0a/Reebok_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440048',
    'wilson',
    'Wilson',
    'Wilson Sporting Goods is an American sports equipment manufacturer based in Chicago, Illinois.',
    'https://upload.wikimedia.org/wikipedia/commons/8/8a/Wilson_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440049',
    'spalding',
    'Spalding',
    'Spalding is an American sporting goods company founded in 1876 and headquartered in Bowling Green, Kentucky.',
    'https://upload.wikimedia.org/wikipedia/commons/3/37/Spalding_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440050',
    'callaway',
    'Callaway',
    'Callaway Golf Company is an American sports equipment manufacturing company that designs, manufactures, and sells golf clubs, golf balls, and other golf-related accessories.',
    'https://upload.wikimedia.org/wikipedia/commons/8/8b/Callaway_Golf_logo.svg',
    0,
    NOW(),
    NOW()
),
-- Automotive Brands
(
    'bb0e8400-e29b-41d4-a716-446655440051',
    'bosch-automotive',
    'Bosch Automotive',
    'Bosch Automotive is a division of Robert Bosch GmbH that produces automotive components.',
    'https://upload.wikimedia.org/wikipedia/commons/4/4e/Bosch-logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440052',
    'mobil-1',
    'Mobil 1',
    'Mobil 1 is a brand of synthetic motor oil and other automotive lubrication products.',
    'https://upload.wikimedia.org/wikipedia/commons/6/60/Mobil_1_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440053',
    'castrol',
    'Castrol',
    'Castrol is a British brand of industrial and automotive lubricants offering a wide range of oils, greases and similar products for most lubrication applications.',
    'https://upload.wikimedia.org/wikipedia/commons/6/64/Castrol_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440054',
    'goodyear',
    'Goodyear',
    'The Goodyear Tire & Rubber Company is an American multinational tire manufacturing company founded in 1898 by Frank Seiberling and based in Akron, Ohio.',
    'https://upload.wikimedia.org/wikipedia/commons/3/31/Goodyear_Logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440055',
    'michelin',
    'Michelin',
    'Michelin is a French multinational tyre manufacturing company based in Clermont-Ferrand in the Auvergne-Rhône-Alpes région of France.',
    'https://upload.wikimedia.org/wikipedia/commons/4/4d/Michelin_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440056',
    'stanley',
    'Stanley',
    'Stanley Black & Decker is a Fortune 500 American manufacturer of industrial tools and household hardware and provider of security products.',
    'https://upload.wikimedia.org/wikipedia/commons/9/96/Stanley_Black_%26_Decker_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440057',
    'dewalt',
    'DeWalt',
    'DeWalt is an American worldwide brand of power tools and hand tools for the construction, manufacturing and woodworking industries.',
    'https://upload.wikimedia.org/wikipedia/commons/8/8d/DeWalt_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440058',
    'makita',
    'Makita',
    'Makita Corporation is a Japanese manufacturer of power tools.',
    'https://upload.wikimedia.org/wikipedia/commons/4/44/Makita_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440059',
    'milwaukee',
    'Milwaukee',
    'Milwaukee Electric Tool Corporation is a manufacturer of heavy-duty power tools, accessories and hand tools for professional users worldwide.',
    'https://upload.wikimedia.org/wikipedia/commons/d/d7/Milwaukee_Tool_logo.svg',
    0,
    NOW(),
    NOW()
),
(
    'bb0e8400-e29b-41d4-a716-446655440060',
    'kia',
    'Kia',
    'Kia Corporation, commonly known as Kia, is a South Korean multinational automobile manufacturer headquartered in Seoul, South Korea.',
    'https://upload.wikimedia.org/wikipedia/commons/4/4c/Kia_logo.svg',
    0,
    NOW(),
    NOW()
);
