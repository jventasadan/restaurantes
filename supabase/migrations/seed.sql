-- =====================================================================
-- DATOS DEMO: AL PUNTO ARROCES Y CARNES
-- =====================================================================

-- 1. Restaurantes
insert into public.restaurants (restaurant_id, name, assistant_name, assistant_personality, welcome_message, location, specialties, restrictions)
values 
('al-punto-rivas', 'Al Punto Arroces y Carnes - Rivas', 'Martín', 'Un camarero tradicional de Rivas, experto en brasas, educado y con un toque acogedor y familiar.', '¡Hola! Te damos la bienvenida a Al Punto Rivas. Soy Martín, tu asistente de mesa. ¿Listos para disfrutar de unas buenas brasas o un arroz en leña?', 'Rivas-Vaciamadrid, Madrid', 'Carnes a la brasa y Arroces a la leña', 'Recomienda siempre el punto de las carnes a la brasa y recuerda que los arroces se preparan para un mínimo de 2 personas.'),
('al-punto-sanse', 'Al Punto Arroces y Carnes - Sanse', 'Sofía', 'Una sumiller y camarera sofisticada y atenta, experta en vinos y cortes de carne madurados, con una atención premium.', 'Bienvenidos a Al Punto San Sebastián de los Reyes. Soy Sofía. ¿Qué os apetece almorzar hoy? ¿Os apetece empezar con unas croquetas de carabineros?', 'San Sebastián de los Reyes, Madrid', 'Asados en horno de leña y arroces', 'Destaca los asados del horno de leña como el cochinillo y el cordero.');

-- 2. Branding de Restaurantes
insert into public.restaurant_branding (restaurant_id, logo_url, hero_image_url, primary_color, secondary_color)
values
('al-punto-rivas', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150&h=150&fit=crop', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop', '#C8A96E', '#0D0D0D'),
('al-punto-sanse', 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=150&h=150&fit=crop', 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&auto=format&fit=crop', '#D4AF37', '#1A1A1A');

-- 3. Mesas
insert into public.tables (table_id, restaurant_id, name, zone, status, seasonal)
values
-- Rivas
('rivas-t1', 'al-punto-rivas', 'Mesa 1', 'interior', 'active', false),
('rivas-t2', 'al-punto-rivas', 'Mesa 2', 'interior', 'active', false),
('rivas-t3', 'al-punto-rivas', 'Mesa 3', 'interior', 'active', false),
('rivas-t4', 'al-punto-rivas', 'Mesa Terraza 1', 'terraza', 'active', true),
-- Sanse
('sanse-t1', 'al-punto-sanse', 'Mesa 1', 'interior', 'active', false),
('sanse-t2', 'al-punto-sanse', 'Mesa 2', 'interior', 'active', false),
('sanse-t3', 'al-punto-sanse', 'Mesa Terraza 1', 'terraza', 'active', true);

-- 4. Platos de la Carta (menu_items)
insert into public.menu_items (id, restaurant_id, category, name, description, price, price_type, allergens, available, notes, image_url, source)
values
-- RIVAS ENTRANTES
(gen_random_uuid(), 'al-punto-rivas', 'Entrantes', 'Croqueta Jamón Ibérico', 'Crujiente por fuera y sumamente cremosa por dentro, hecha con jamón de bellota.', 3.00, 'por unidad', array['gluten', 'lacteos'], true, null, 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=400', 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Entrantes', 'Croquetas de Carabineros', 'Ración de croquetas melosas con intenso sabor a carabinero de la costa.', 15.00, 'por ración', array['gluten', 'lacteos', 'marisco'], true, null, null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Entrantes', 'Sardina Ahumada', 'Servida sobre tosta de pan cristal con tomate concassé y aceite de oliva virgen.', 16.00, 'por ración', array['gluten', 'pescado'], true, null, null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Entrantes', 'Alcachofas Ali-Oli', 'Alcachofas confitadas a la plancha acompañadas de alioli suave de ajo negro.', 17.00, 'por ración', array['huevo'], true, null, null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Entrantes', 'Torrezno Ibérico con puré', 'Crujiente torrezno ibérico horneado y frito, servido sobre puré de patata trufado.', 19.00, 'por ración', array['lacteos'], true, null, null, 'manual'),

-- RIVAS ARROCES
(gen_random_uuid(), 'al-punto-rivas', 'Arroces', 'Arroz Verduras', 'Arroz meloso con verduras de la huerta madrileña cocinado con caldo vegetal.', 16.00, 'por persona (mín. 2 personas)', array['apio'], true, 'Mínimo 2 personas', null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Arroces', 'Arroz Bogavante Caldoso', 'Arroz caldoso con bogavante nacional y un potente fondo de roca marisquera.', 24.00, 'por persona (mín. 2 personas)', array['marisco', 'pescado', 'moluscos'], true, 'Mínimo 2 personas', null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Arroces', 'Arroz Negro', 'Arroz con sepia y gambas cocinado en su tinta, servido con alioli tradicional.', 18.00, 'por persona (mín. 2 personas)', array['marisco', 'pescado', 'moluscos', 'huevo'], true, 'Mínimo 2 personas', null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Arroces', 'Fideuá Negra', 'Fideo fino tostado, sepia y gambas en su tinta con alioli suave.', 18.00, 'por persona (mín. 2 personas)', array['gluten', 'marisco', 'pescado', 'moluscos', 'huevo'], true, 'Mínimo 2 personas', null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Arroces', 'El Señoret', 'Arroz con todos los mariscos pelados para comer cómodamente.', 20.00, 'por persona (mín. 2 personas)', array['marisco', 'pescado', 'moluscos'], true, 'Mínimo 2 personas', null, 'manual'),

-- RIVAS CARNES
(gen_random_uuid(), 'al-punto-rivas', 'Carnes', 'Lomo Alto Vaca Nacional', 'Corte de lomo alto a la brasa con 40 días de maduración (aprox 400g).', 28.00, 'por ración', array[]::text[], true, 'Preguntar punto de carne', null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Carnes', 'Entrecot Ternera Finlandia', 'Entrecot procedente de vacuno finlandés alimentado en pastos, a las brasas.', 24.00, 'por ración', array[]::text[], true, 'Preguntar punto de carne', null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Carnes', 'T-Bone Angus', 'Corte de 700g que combina solomillo y lomo a la parilla de carbón de encina.', 32.00, 'por ración', array[]::text[], true, 'Preguntar punto de carne', null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Carnes', 'Solomillo Ternera', 'Solomillo a la brasa tierno, servido con patatas fritas caseras.', 26.00, 'por ración', array[]::text[], true, 'Preguntar punto de carne', null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Carnes', 'Solomillo con Foie', 'Solomillo a la brasa coronado con medallón de foie fresco a la plancha.', 30.00, 'por ración', array['sulfitos'], true, 'Preguntar punto de carne', null, 'manual'),

-- RIVAS ASADOS
(gen_random_uuid(), 'al-punto-rivas', 'Asados', 'Cochinillo Asado', 'Ración de cochinillo asado al estilo tradicional en horno de leña.', 26.00, 'por ración', array[]::text[], true, null, null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Asados', 'Cordero Asado', 'Paletilla de cordero lechal asada lentamente al aroma de tomillo.', 25.00, 'por ración', array[]::text[], true, null, null, 'manual'),

-- RIVAS POSTRES
(gen_random_uuid(), 'al-punto-rivas', 'Postres', 'Tarta Queso Tibio', 'Tarta de queso horneada, cremosa y servida a temperatura ambiente.', 7.00, 'por ración', array['gluten', 'lacteos', 'huevo'], true, null, null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Postres', 'Carrot Cake', 'Pastel de zanahoria con frosting de queso crema y nueces.', 6.00, 'por ración', array['gluten', 'lacteos', 'huevo', 'frutos de cascara'], true, null, null, 'manual'),
(gen_random_uuid(), 'al-punto-rivas', 'Postres', 'Tarta Chocolate', 'Tarta de chocolate negro belga con base crujiente.', 6.00, 'por ración', array['gluten', 'lacteos', 'huevo'], true, null, null, 'manual'),

-- SANSE ENTRANTES
(gen_random_uuid(), 'al-punto-sanse', 'Entrantes', 'Croqueta Jamón Ibérico', 'Croqueta cremosa de jamón ibérico.', 3.00, 'por unidad', array['gluten', 'lacteos'], true, null, null, 'manual'),
(gen_random_uuid(), 'al-punto-sanse', 'Entrantes', 'Alcachofas Ali-Oli', 'Alcachofas asadas con ali-oli.', 17.00, 'por ración', array['huevo'], true, null, null, 'manual'),

-- SANSE ASADOS
(gen_random_uuid(), 'al-punto-sanse', 'Asados', 'Cochinillo Crujiente', 'Cochinillo deshuesado asado a baja temperatura con piel crujiente.', 27.00, 'por ración', array[]::text[], true, null, null, 'manual'),
(gen_random_uuid(), 'al-punto-sanse', 'Asados', 'Cabrito Lechal Asado', 'Asado lento de cabrito lechal con patatas panadera.', 28.00, 'por ración', array[]::text[], true, null, null, 'manual');
