-- Tabela de categorias e subcategorias
CREATE TABLE IF NOT EXISTS categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  parent_slug text REFERENCES categories(slug),
  name_pt text NOT NULL,
  name_en text NOT NULL,
  icon text,
  context text CHECK (context IN ('project','inventory','both')),
  sort_order integer DEFAULT 0
);

-- Tabela de definições de campos por categoria
CREATE TABLE IF NOT EXISTS category_fields (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_slug text REFERENCES categories(slug),
  field_key text NOT NULL,
  label_pt text NOT NULL,
  label_en text NOT NULL,
  field_type text CHECK (field_type IN (
    'text','number','select','boolean','date',
    'range','multiselect','textarea'
  )),
  options_pt jsonb,
  options_en jsonb,
  unit text,
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

-- Valores dos campos por item
CREATE TABLE IF NOT EXISTS item_field_values (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL,
  item_type text CHECK (item_type IN ('project','inventory')),
  field_key text NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_id, item_type, field_key)
);

-- Histórico universal de todos os items
CREATE TABLE IF NOT EXISTS item_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL,
  item_type text CHECK (item_type IN ('project','inventory','expense','lot')),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  notes text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Lotes de compra
CREATE TABLE IF NOT EXISTS lots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  lot_number text UNIQUE,
  supplier text,
  purchase_price decimal(10,2) NOT NULL,
  purchase_date date DEFAULT CURRENT_DATE,
  description text,
  estimated_items integer,
  status text DEFAULT 'untriaged' CHECK (status IN (
    'untriaged','in_progress','completed'
  )),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_lots" ON lots
  FOR ALL USING (auth.uid() = user_id);

-- Adiciona colunas de lote e canibalização ao inventário
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS item_context text
    DEFAULT 'new' CHECK (item_context IN ('new','cannibalized','lot')),
  ADD COLUMN IF NOT EXISTS lot_id uuid REFERENCES lots(id),
  ADD COLUMN IF NOT EXISTS source_project_id uuid REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS cannibalization_reason text,
  ADD COLUMN IF NOT EXISTS condition_tested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_slug text,
  ADD COLUMN IF NOT EXISTS ai_confidence integer,
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]';

-- Adiciona categoria ao projecto
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS category_slug text,
  ADD COLUMN IF NOT EXISTS lot_id uuid REFERENCES lots(id),
  ADD COLUMN IF NOT EXISTS ai_confidence integer;

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public" ON categories FOR SELECT USING (true);
CREATE POLICY "fields_public" ON category_fields FOR SELECT USING (true);
CREATE POLICY "users_own_field_values" ON item_field_values
  FOR ALL USING (true);
CREATE POLICY "users_own_history" ON item_history
  FOR ALL USING (auth.uid() = user_id);

-- INSERIR TODAS AS CATEGORIAS

INSERT INTO categories (slug, parent_slug, name_pt, name_en, icon, context, sort_order) VALUES
-- ÁUDIO
('audio', null, 'Áudio & Som', 'Audio & Sound', '🎵', 'both', 1),
('audio-amplifier', 'audio', 'Amplificador', 'Amplifier', '🔊', 'project', 1),
('audio-receiver', 'audio', 'Receiver AV', 'AV Receiver', '📻', 'project', 2),
('audio-preamp', 'audio', 'Pré-Amplificador', 'Pre-Amplifier', '🎛️', 'project', 3),
('audio-turntable', 'audio', 'Gira-Discos', 'Turntable', '💿', 'project', 4),
('audio-tapedeck', 'audio', 'Tape Deck', 'Tape Deck', '📼', 'project', 5),
('audio-cd', 'audio', 'Leitor CD/SACD', 'CD/SACD Player', '💽', 'project', 6),
('audio-reel', 'audio', 'Reel-to-Reel', 'Reel-to-Reel', '🎞️', 'project', 7),
('audio-tuner', 'audio', 'Sintonizador FM/AM', 'FM/AM Tuner', '📡', 'project', 8),
('audio-speakers', 'audio', 'Colunas', 'Speakers', '🔈', 'project', 9),
('audio-subwoofer', 'audio', 'Subwoofer', 'Subwoofer', '💥', 'project', 10),
('audio-radio', 'audio', 'Rádio Vintage', 'Vintage Radio', '📻', 'project', 11),
('audio-tubes', 'audio', 'Válvulas (Tubes)', 'Vacuum Tubes', '💡', 'inventory', 20),
('audio-capacitors', 'audio', 'Capacitores de Áudio', 'Audio Capacitors', '⚡', 'inventory', 21),
('audio-transformers', 'audio', 'Transformadores', 'Transformers', '🔌', 'inventory', 22),
('audio-pots', 'audio', 'Potenciómetros', 'Potentiometers', '🎚️', 'inventory', 23),
('audio-transistors', 'audio', 'Transistores de Saída', 'Output Transistors', '🔧', 'inventory', 24),
('audio-belt', 'audio', 'Correia Gira-Discos', 'Turntable Belt', '⭕', 'inventory', 25),
('audio-needle', 'audio', 'Agulha/Cápsula', 'Stylus/Cartridge', '📍', 'inventory', 26),
('audio-woofer-part', 'audio', 'Woofer/Tweeter', 'Woofer/Tweeter', '🔈', 'inventory', 27),
-- PORTÁTEIS
('laptops', null, 'Portáteis & Notebooks', 'Laptops & Notebooks', '💻', 'both', 2),
('laptop-windows', 'laptops', 'Notebook Windows', 'Windows Laptop', '🪟', 'project', 1),
('laptop-macbook-air', 'laptops', 'MacBook Air', 'MacBook Air', '🍎', 'project', 2),
('laptop-macbook-pro', 'laptops', 'MacBook Pro', 'MacBook Pro', '🍎', 'project', 3),
('laptop-chromebook', 'laptops', 'Chromebook', 'Chromebook', '🌐', 'project', 4),
('laptop-screen', 'laptops', 'Ecrã/Display', 'Screen/Display', '🖥️', 'inventory', 10),
('laptop-keyboard', 'laptops', 'Teclado', 'Keyboard', '⌨️', 'inventory', 11),
('laptop-battery', 'laptops', 'Bateria', 'Battery', '🔋', 'inventory', 12),
('laptop-motherboard', 'laptops', 'Placa-mãe', 'Motherboard', '🔲', 'inventory', 13),
('laptop-ram', 'laptops', 'RAM SO-DIMM', 'RAM SO-DIMM', '💾', 'inventory', 14),
('laptop-ssd', 'laptops', 'SSD/HDD Portátil', 'Laptop SSD/HDD', '💿', 'inventory', 15),
('laptop-charger', 'laptops', 'Fonte/Carregador', 'Charger/Adapter', '🔌', 'inventory', 16),
('laptop-fan', 'laptops', 'Ventoinha/Cooler', 'Fan/Cooler', '🌀', 'inventory', 17),
('laptop-hinge', 'laptops', 'Dobradiça', 'Hinge', '🔩', 'inventory', 18),
('laptop-casing', 'laptops', 'Carcaça', 'Casing', '📦', 'inventory', 19),
('laptop-webcam', 'laptops', 'Webcam', 'Webcam', '📷', 'inventory', 20),
('laptop-touchpad', 'laptops', 'Touchpad', 'Touchpad', '👆', 'inventory', 21),
-- DESKTOP & ALL-IN-ONE
('desktop', null, 'Desktop & All-in-One', 'Desktop & All-in-One', '🖥️', 'both', 3),
('desktop-imac', 'desktop', 'iMac', 'iMac', '🍎', 'project', 1),
('desktop-mac-mini', 'desktop', 'Mac Mini/Pro/Studio', 'Mac Mini/Pro/Studio', '🍎', 'project', 2),
('desktop-windows-aio', 'desktop', 'All-in-One Windows', 'Windows All-in-One', '🪟', 'project', 3),
('desktop-windows-tower', 'desktop', 'Desktop Windows', 'Windows Desktop', '🖥️', 'project', 4),
('desktop-workstation', 'desktop', 'Workstation', 'Workstation', '💼', 'project', 5),
('desktop-motherboard', 'desktop', 'Placa-mãe Desktop', 'Desktop Motherboard', '🔲', 'inventory', 10),
('desktop-cpu', 'desktop', 'Processador CPU', 'CPU Processor', '⚡', 'inventory', 11),
('desktop-ram-dimm', 'desktop', 'RAM DIMM', 'RAM DIMM', '💾', 'inventory', 12),
('desktop-gpu', 'desktop', 'Placa Gráfica GPU', 'GPU Graphics Card', '🎮', 'inventory', 13),
('desktop-ssd-35', 'desktop', 'SSD/HDD Desktop', 'Desktop SSD/HDD', '💿', 'inventory', 14),
('desktop-psu', 'desktop', 'Fonte de Alimentação', 'Power Supply PSU', '🔌', 'inventory', 15),
('desktop-case', 'desktop', 'Caixa/Case', 'PC Case', '📦', 'inventory', 16),
('desktop-cooler', 'desktop', 'Cooler CPU/GPU', 'CPU/GPU Cooler', '🌀', 'inventory', 17),
('desktop-imac-screen', 'desktop', 'Ecrã iMac', 'iMac Display', '🖥️', 'inventory', 18),
('desktop-imac-board', 'desktop', 'Placa Lógica iMac', 'iMac Logic Board', '🔲', 'inventory', 19),
-- CONSOLAS
('consoles', null, 'Consolas & Gaming', 'Consoles & Gaming', '🎮', 'both', 4),
('console-playstation', 'consoles', 'PlayStation', 'PlayStation', '🎮', 'project', 1),
('console-xbox', 'consoles', 'Xbox', 'Xbox', '🎮', 'project', 2),
('console-nintendo-home', 'consoles', 'Nintendo (Casa)', 'Nintendo (Home)', '🎮', 'project', 3),
('console-nintendo-portable', 'consoles', 'Nintendo (Portátil)', 'Nintendo (Portable)', '🕹️', 'project', 4),
('console-sega', 'consoles', 'Sega', 'Sega', '🎮', 'project', 5),
('console-psp-vita', 'consoles', 'PSP / PS Vita', 'PSP / PS Vita', '🕹️', 'project', 6),
('console-steamdeck', 'consoles', 'Steam Deck', 'Steam Deck', '🕹️', 'project', 7),
('console-retro', 'consoles', 'Retro / Outras', 'Retro / Other', '👾', 'project', 8),
('console-controller', 'consoles', 'Comando/Controller', 'Controller/Gamepad', '🕹️', 'inventory', 10),
('console-optical', 'consoles', 'Leitor Ótico', 'Optical Drive', '💿', 'inventory', 11),
('console-fan', 'consoles', 'Ventoinha Consola', 'Console Fan', '🌀', 'inventory', 12),
('console-psu', 'consoles', 'Fonte Consola', 'Console PSU', '🔌', 'inventory', 13),
('console-hdmi-board', 'consoles', 'HDMI Board', 'HDMI Board', '📺', 'inventory', 14),
('console-controller-stick', 'consoles', 'Stick Analógico', 'Analog Stick', '🕹️', 'inventory', 15),
('console-controller-trigger', 'consoles', 'Gatilho/Trigger', 'Trigger', '🔫', 'inventory', 16),
('console-controller-battery', 'consoles', 'Bateria Comando', 'Controller Battery', '🔋', 'inventory', 17),
('console-controller-board', 'consoles', 'Placa Comando', 'Controller Board', '🔲', 'inventory', 18),
('console-dock', 'consoles', 'Dock/Base', 'Dock/Base', '⚓', 'inventory', 19),
-- TELEMÓVEIS & TABLETS
('mobile', null, 'Telemóveis & Tablets', 'Mobile & Tablets', '📱', 'both', 5),
('mobile-iphone', 'mobile', 'iPhone', 'iPhone', '🍎', 'project', 1),
('mobile-android-flagship', 'mobile', 'Android Flagship', 'Android Flagship', '📱', 'project', 2),
('mobile-android-mid', 'mobile', 'Android Mid-range', 'Android Mid-range', '📱', 'project', 3),
('mobile-android-basic', 'mobile', 'Android Básico', 'Android Basic', '📱', 'project', 4),
('mobile-ipad', 'mobile', 'iPad', 'iPad', '🍎', 'project', 5),
('mobile-tablet-android', 'mobile', 'Tablet Android', 'Android Tablet', '📱', 'project', 6),
('mobile-tablet-windows', 'mobile', 'Tablet Windows', 'Windows Tablet', '🪟', 'project', 7),
('mobile-ereader', 'mobile', 'E-Reader', 'E-Reader', '📚', 'project', 8),
('mobile-screen', 'mobile', 'Ecrã Completo', 'Complete Screen', '📱', 'inventory', 10),
('mobile-battery', 'mobile', 'Bateria Telemóvel', 'Phone Battery', '🔋', 'inventory', 11),
('mobile-motherboard', 'mobile', 'Placa Lógica', 'Logic Board', '🔲', 'inventory', 12),
('mobile-camera', 'mobile', 'Câmara', 'Camera', '📷', 'inventory', 13),
('mobile-charging-port', 'mobile', 'Porta de Carga', 'Charging Port', '🔌', 'inventory', 14),
('mobile-housing', 'mobile', 'Carcaça', 'Housing', '📦', 'inventory', 15),
-- PERIFÉRICOS PC
('peripherals', null, 'Periféricos PC', 'PC Peripherals', '🖨️', 'both', 6),
('peripheral-monitor', 'peripherals', 'Monitor', 'Monitor', '🖥️', 'project', 1),
('peripheral-keyboard', 'peripherals', 'Teclado PC', 'PC Keyboard', '⌨️', 'project', 2),
('peripheral-mouse', 'peripherals', 'Rato/Mouse', 'Mouse', '🖱️', 'project', 3),
('peripheral-printer', 'peripherals', 'Impressora', 'Printer', '🖨️', 'project', 4),
('peripheral-headset', 'peripherals', 'Headset', 'Headset', '🎧', 'project', 5),
('peripheral-webcam', 'peripherals', 'Webcam PC', 'PC Webcam', '📷', 'project', 6),
('peripheral-ups', 'peripherals', 'UPS/No-break', 'UPS', '🔋', 'project', 7),
-- LOTES
('lots-category', null, 'Lotes Mistos', 'Mixed Lots', '📦', 'both', 7),
('lot-untriaged', 'lots-category', 'Lote Não Triado', 'Untriaged Lot', '❓', 'inventory', 1),
('lot-item', 'lots-category', 'Item de Lote', 'Lot Item', '📋', 'both', 2),
-- CONSUMÍVEIS
('consumables', null, 'Consumíveis & Insumos', 'Consumables & Supplies', '🧪', 'inventory', 8),
('consumable-solder', 'consumables', 'Estanho/Solda', 'Solder', '🔧', 'inventory', 1),
('consumable-flux', 'consumables', 'Fluxo de Solda', 'Flux', '🧴', 'inventory', 2),
('consumable-wick', 'consumables', 'Malha Desoldadora', 'Desoldering Wick', '🔧', 'inventory', 3),
('consumable-thermal', 'consumables', 'Pasta/Almofada Térmica', 'Thermal Paste/Pad', '🌡️', 'inventory', 4),
('consumable-alcohol', 'consumables', 'Álcool Isopropílico', 'Isopropyl Alcohol', '🧪', 'inventory', 5),
('consumable-adhesive', 'consumables', 'Adesivo B-7000/UV', 'B-7000/UV Adhesive', '🔧', 'inventory', 6),
('consumable-screen-film', 'consumables', 'Película Protectora', 'Screen Protector Film', '📱', 'inventory', 7),
('consumable-other', 'consumables', 'Outro Consumível', 'Other Consumable', '📦', 'inventory', 8),
-- FERRAMENTAS & PATRIMÔNIO
('tools', null, 'Ferramentas & Patrimônio', 'Tools & Assets', '🔧', 'inventory', 9),
('tool-oscilloscope', 'tools', 'Osciloscópio', 'Oscilloscope', '📊', 'inventory', 1),
('tool-thermal-camera', 'tools', 'Câmara Térmica', 'Thermal Camera', '🌡️', 'inventory', 2),
('tool-multimeter', 'tools', 'Multímetro', 'Multimeter', '⚡', 'inventory', 3),
('tool-soldering', 'tools', 'Estação de Solda', 'Soldering Station', '🔧', 'inventory', 4),
('tool-hotair', 'tools', 'Hot Air/Rework', 'Hot Air/Rework Station', '💨', 'inventory', 5),
('tool-psu-bench', 'tools', 'Fonte de Bancada', 'Bench Power Supply', '🔌', 'inventory', 6),
('tool-microscope', 'tools', 'Microscópio Digital', 'Digital Microscope', '🔬', 'inventory', 7),
('tool-ultrasonic', 'tools', 'Ultrassónico', 'Ultrasonic Cleaner', '🔊', 'inventory', 8),
('tool-monitor', 'tools', 'Monitor de Teste', 'Test Monitor', '🖥️', 'inventory', 9),
('tool-printer', 'tools', 'Impressora Etiquetas', 'Label Printer', '🖨️', 'inventory', 10),
('tool-screwdriver', 'tools', 'Chaves de Precisão', 'Precision Screwdrivers', '🔩', 'inventory', 11),
('tool-other', 'tools', 'Outra Ferramenta', 'Other Tool', '🔧', 'inventory', 12),
-- GENÉRICO
('generic', null, 'Genérico / Outro', 'Generic / Other', '📦', 'both', 10),
('generic-equipment', 'generic', 'Equipamento Genérico', 'Generic Equipment', '📦', 'project', 1),
('generic-part', 'generic', 'Peça Genérica', 'Generic Part', '🔩', 'inventory', 2)
ON CONFLICT (slug) DO NOTHING;

-- INSERIR CAMPOS POR CATEGORIA
INSERT INTO category_fields (category_slug, field_key, label_pt, label_en, field_type, options_pt, options_en, unit, sort_order) VALUES
-- Amplificador de áudio
('audio-amplifier', 'power_watts', 'Potência RMS', 'RMS Power', 'number', null, null, 'W', 1),
('audio-amplifier', 'impedance', 'Impedância', 'Impedance', 'select', '["4Ω","6Ω","8Ω","4-16Ω"]', '["4Ω","6Ω","8Ω","4-16Ω"]', null, 2),
('audio-amplifier', 'amp_type', 'Tipo de Amplificação', 'Amplification Type', 'select', '["Transistor","Válvulas","Híbrido","Classe A","Classe AB","Classe D"]', '["Transistor","Tubes","Hybrid","Class A","Class AB","Class D"]', null, 3),
('audio-amplifier', 'year_manufactured', 'Ano de Fabrico', 'Year Manufactured', 'number', null, null, null, 4),
('audio-amplifier', 'capacitors_replaced', 'Capacitores Substituídos', 'Capacitors Replaced', 'boolean', null, null, null, 5),
('audio-amplifier', 'pot_condition', 'Estado Potenciómetro', 'Pot Condition', 'select', '["Limpo","Ruidoso","Partido","Substituído"]', '["Clean","Noisy","Broken","Replaced"]', null, 6),
('audio-amplifier', 'inputs', 'Entradas Disponíveis', 'Available Inputs', 'multiselect', '["Phono MM","Phono MC","AUX","Tape","Tuner","CD","Video","Digital Ótico","Digital Coaxial"]', '["Phono MM","Phono MC","AUX","Tape","Tuner","CD","Video","Optical Digital","Coaxial Digital"]', null, 7),
('audio-amplifier', 'transformer_ok', 'Transformador OK', 'Transformer OK', 'boolean', null, null, null, 8),
('audio-amplifier', 'channels', 'Canais', 'Channels', 'select', '["Mono","2.0 Estéreo","2.1","5.1","7.1","9.1"]', '["Mono","2.0 Stereo","2.1","5.1","7.1","9.1"]', null, 9),
-- Gira-discos
('audio-turntable', 'drive_type', 'Tipo de Accionamento', 'Drive Type', 'select', '["Belt Drive","Direct Drive","Idler Drive"]', '["Belt Drive","Direct Drive","Idler Drive"]', null, 1),
('audio-turntable', 'tonearm_included', 'Braço Incluído', 'Tonearm Included', 'boolean', null, null, null, 2),
('audio-turntable', 'tonearm_brand', 'Marca do Braço', 'Tonearm Brand', 'text', null, null, null, 3),
('audio-turntable', 'cartridge_included', 'Cápsula Incluída', 'Cartridge Included', 'boolean', null, null, null, 4),
('audio-turntable', 'belt_condition', 'Estado da Correia', 'Belt Condition', 'select', '["Original OK","Substituída","Em Falta","Partida"]', '["Original OK","Replaced","Missing","Broken"]', null, 5),
('audio-turntable', 'lid_condition', 'Estado da Tampa', 'Lid Condition', 'select', '["Presente OK","Rachada","Em Falta"]', '["Present OK","Cracked","Missing"]', null, 6),
('audio-turntable', 'motor_ok', 'Motor Funcional', 'Motor Working', 'boolean', null, null, null, 7),
('audio-turntable', 'speeds', 'Velocidades', 'Speeds', 'multiselect', '["33 RPM","45 RPM","78 RPM"]', '["33 RPM","45 RPM","78 RPM"]', null, 8),
-- Válvulas
('audio-tubes', 'tube_type', 'Tipo de Válvula', 'Tube Type', 'select', '["6L6","EL34","EL84","KT88","KT66","300B","2A3","12AX7","12AU7","6SN7","6922","ECC83","ECC82","Outro"]', '["6L6","EL34","EL84","KT88","KT66","300B","2A3","12AX7","12AU7","6SN7","6922","ECC83","ECC82","Other"]', null, 1),
('audio-tubes', 'tube_quantity', 'Quantidade (par/quarteto)', 'Quantity (pair/quad)', 'select', '["Individual","Par","Quarteto","Outro"]', '["Single","Pair","Quad","Other"]', null, 2),
('audio-tubes', 'tube_tested', 'Testada', 'Tested', 'boolean', null, null, null, 3),
('audio-tubes', 'tube_hours', 'Horas de Uso Estimadas', 'Estimated Hours Used', 'number', null, null, 'h', 4),
('audio-tubes', 'tube_matched', 'Par Combinado', 'Matched Pair', 'boolean', null, null, null, 5),
-- iPhone
('mobile-iphone', 'imei', 'IMEI', 'IMEI', 'text', null, null, null, 1),
('mobile-iphone', 'imei2', 'IMEI 2 (Dual SIM)', 'IMEI 2 (Dual SIM)', 'text', null, null, null, 2),
('mobile-iphone', 'storage_gb', 'Armazenamento', 'Storage', 'select', '["16GB","32GB","64GB","128GB","256GB","512GB","1TB"]', '["16GB","32GB","64GB","128GB","256GB","512GB","1TB"]', null, 3),
('mobile-iphone', 'color', 'Cor', 'Color', 'text', null, null, null, 4),
('mobile-iphone', 'battery_health', 'Saúde da Bateria', 'Battery Health', 'number', null, null, '%', 5),
('mobile-iphone', 'battery_cycles', 'Ciclos de Carga', 'Battery Cycles', 'number', null, null, null, 6),
('mobile-iphone', 'battery_mah_original', 'Bateria Original (mAh)', 'Original Battery (mAh)', 'number', null, null, 'mAh', 7),
('mobile-iphone', 'face_id_ok', 'Face ID Funcional', 'Face ID Working', 'boolean', null, null, null, 8),
('mobile-iphone', 'touch_id_ok', 'Touch ID Funcional', 'Touch ID Working', 'boolean', null, null, null, 9),
('mobile-iphone', 'icloud_locked', 'Bloqueado iCloud', 'iCloud Locked', 'boolean', null, null, null, 10),
('mobile-iphone', 'activation_locked', 'Bloqueado Activação', 'Activation Locked', 'boolean', null, null, null, 11),
-- Android Flagship
('mobile-android-flagship', 'imei', 'IMEI', 'IMEI', 'text', null, null, null, 1),
('mobile-android-flagship', 'imei2', 'IMEI 2', 'IMEI 2', 'text', null, null, null, 2),
('mobile-android-flagship', 'storage_gb', 'Armazenamento', 'Storage', 'select', '["64GB","128GB","256GB","512GB","1TB"]', '["64GB","128GB","256GB","512GB","1TB"]', null, 3),
('mobile-android-flagship', 'ram_gb', 'RAM', 'RAM', 'select', '["4GB","6GB","8GB","12GB","16GB"]', '["4GB","6GB","8GB","12GB","16GB"]', null, 4),
('mobile-android-flagship', 'battery_health', 'Saúde da Bateria', 'Battery Health', 'number', null, null, '%', 5),
('mobile-android-flagship', 'knox_tripped', 'Knox Disparado', 'Knox Tripped', 'boolean', null, null, null, 6),
-- Laptop Windows
('laptop-windows', 'cpu_brand', 'Marca CPU', 'CPU Brand', 'select', '["Intel","AMD","Qualcomm"]', '["Intel","AMD","Qualcomm"]', null, 1),
('laptop-windows', 'cpu_model', 'Modelo CPU', 'CPU Model', 'text', null, null, null, 2),
('laptop-windows', 'ram_gb', 'RAM (GB)', 'RAM (GB)', 'select', '["4GB","8GB","16GB","32GB","64GB"]', '["4GB","8GB","16GB","32GB","64GB"]', null, 3),
('laptop-windows', 'ram_type', 'Tipo RAM', 'RAM Type', 'select', '["DDR3","DDR4","DDR5","LPDDR4","LPDDR5"]', '["DDR3","DDR4","DDR5","LPDDR4","LPDDR5"]', null, 4),
('laptop-windows', 'storage_gb', 'Armazenamento (GB)', 'Storage (GB)', 'number', null, null, 'GB', 5),
('laptop-windows', 'storage_type', 'Tipo Armazenamento', 'Storage Type', 'select', '["HDD","SSD SATA","SSD NVMe","eMMC"]', '["HDD","SSD SATA","SSD NVMe","eMMC"]', null, 6),
('laptop-windows', 'screen_size', 'Tamanho Ecrã', 'Screen Size', 'select', '["11\"","12\"","13\"","13.3\"","14\"","15\"","15.6\"","16\"","17\"","17.3\""]', '["11\"","12\"","13\"","13.3\"","14\"","15\"","15.6\"","16\"","17\"","17.3\""]', null, 7),
('laptop-windows', 'screen_resolution', 'Resolução', 'Resolution', 'select', '["1366x768 HD","1920x1080 FHD","2560x1440 QHD","3840x2160 4K","2880x1800","Outra"]', '["1366x768 HD","1920x1080 FHD","2560x1440 QHD","3840x2160 4K","2880x1800","Other"]', null, 8),
('laptop-windows', 'battery_health', 'Saúde Bateria', 'Battery Health', 'number', null, null, '%', 9),
('laptop-windows', 'keyboard_layout', 'Layout Teclado', 'Keyboard Layout', 'select', '["UK","US","PT","FR","DE","ES","Outro"]', '["UK","US","PT","FR","DE","ES","Other"]', null, 10),
('laptop-windows', 'gpu_model', 'GPU Dedicada', 'Dedicated GPU', 'text', null, null, null, 11),
('laptop-windows', 'hinge_condition', 'Estado Dobradiça', 'Hinge Condition', 'select', '["OK","Frouxa","Partida","Substituída"]', '["OK","Loose","Broken","Replaced"]', null, 12),
-- MacBook Pro
('laptop-macbook-pro', 'chip', 'Chip Apple', 'Apple Chip', 'select', '["Intel Core i5","Intel Core i7","Intel Core i9","Apple M1","Apple M1 Pro","Apple M1 Max","Apple M2","Apple M2 Pro","Apple M2 Max","Apple M3","Apple M3 Pro","Apple M3 Max"]', '["Intel Core i5","Intel Core i7","Intel Core i9","Apple M1","Apple M1 Pro","Apple M1 Max","Apple M2","Apple M2 Pro","Apple M2 Max","Apple M3","Apple M3 Pro","Apple M3 Max"]', null, 1),
('laptop-macbook-pro', 'year', 'Ano do Modelo', 'Model Year', 'number', null, null, null, 2),
('laptop-macbook-pro', 'battery_cycles', 'Ciclos de Bateria', 'Battery Cycles', 'number', null, null, null, 3),
('laptop-macbook-pro', 'touchbar', 'Touch Bar', 'Touch Bar', 'boolean', null, null, null, 4),
-- PlayStation
('console-playstation', 'ps_model', 'Modelo PlayStation', 'PlayStation Model', 'select', '["PS1","PS2","PS2 Slim","PS3 Fat","PS3 Slim","PS3 Super Slim","PS4","PS4 Slim","PS4 Pro","PS5","PS5 Slim","PS5 Pro"]', '["PS1","PS2","PS2 Slim","PS3 Fat","PS3 Slim","PS3 Super Slim","PS4","PS4 Slim","PS4 Pro","PS5","PS5 Slim","PS5 Pro"]', null, 1),
('console-playstation', 'region', 'Região', 'Region', 'select', '["PAL (Europa)","NTSC (EUA)","NTSC-J (Japão)"]', '["PAL (Europe)","NTSC (USA)","NTSC-J (Japan)"]', null, 2),
('console-playstation', 'chassis', 'Chassis/Lote', 'Chassis/Lot', 'text', null, null, null, 3),
('console-playstation', 'optical_ok', 'Leitor Ótico Funcional', 'Optical Drive Working', 'boolean', null, null, null, 4),
('console-playstation', 'hdmi_ok', 'HDMI Funcional', 'HDMI Working', 'boolean', null, null, null, 5),
('console-playstation', 'controllers_included', 'Comandos Incluídos', 'Controllers Included', 'number', null, null, null, 6),
('console-playstation', 'modified', 'Modificada/Chipped', 'Modified/Chipped', 'boolean', null, null, null, 7),
-- Xbox
('console-xbox', 'xbox_model', 'Modelo Xbox', 'Xbox Model', 'select', '["Xbox Original","Xbox 360","Xbox 360 S","Xbox 360 E","Xbox One","Xbox One S","Xbox One X","Xbox Series S","Xbox Series X"]', '["Xbox Original","Xbox 360","Xbox 360 S","Xbox 360 E","Xbox One","Xbox One S","Xbox One X","Xbox Series S","Xbox Series X"]', null, 1),
('console-xbox', 'region', 'Região', 'Region', 'select', '["PAL","NTSC","NTSC-J"]', '["PAL","NTSC","NTSC-J"]', null, 2),
('console-xbox', 'rrod', 'Histórico RROD', 'RROD History', 'boolean', null, null, null, 3),
('console-xbox', 'optical_ok', 'Leitor Ótico Funcional', 'Optical Drive Working', 'boolean', null, null, null, 4),
-- Nintendo
('console-nintendo-home', 'nintendo_model', 'Modelo Nintendo', 'Nintendo Model', 'select', '["NES","SNES","N64","GameCube","Wii","Wii U","Switch","Switch OLED","Switch V2"]', '["NES","SNES","N64","GameCube","Wii","Wii U","Switch","Switch OLED","Switch V2"]', null, 1),
('console-nintendo-portable', 'portable_model', 'Modelo Portátil', 'Portable Model', 'select', '["Game Boy","Game Boy Color","Game Boy Advance","GBA SP","DS","DS Lite","DSi","3DS","3DS XL","New 3DS","2DS","Switch Lite"]', '["Game Boy","Game Boy Color","Game Boy Advance","GBA SP","DS","DS Lite","DSi","3DS","3DS XL","New 3DS","2DS","Switch Lite"]', null, 1),
-- Controller
('console-controller', 'controller_type', 'Tipo de Comando', 'Controller Type', 'select', '["DualSense (PS5)","DualShock 4 (PS4)","DualShock 3 (PS3)","Xbox Series","Xbox One","Xbox 360","Pro Controller","Joy-Con","GBA SP","Outro"]', '["DualSense (PS5)","DualShock 4 (PS4)","DualShock 3 (PS3)","Xbox Series","Xbox One","Xbox 360","Pro Controller","Joy-Con","GBA SP","Other"]', null, 1),
('console-controller', 'stick_drift', 'Drift Analógico', 'Stick Drift', 'boolean', null, null, null, 2),
('console-controller', 'triggers_ok', 'Gatilhos Funcionais', 'Triggers Working', 'boolean', null, null, null, 3),
('console-controller', 'vibration_ok', 'Vibração Funcional', 'Vibration Working', 'boolean', null, null, null, 4),
('console-controller', 'haptic_ok', 'Haptic Feedback', 'Haptic Feedback', 'boolean', null, null, null, 5),
('console-controller', 'battery_health', 'Saúde Bateria', 'Battery Health', 'number', null, null, '%', 6),
('console-controller', 'touchpad_ok', 'Touchpad Funcional', 'Touchpad Working', 'boolean', null, null, null, 7),
-- SSD portátil
('laptop-ssd', 'interface', 'Interface', 'Interface', 'select', '["SATA 2.5\"","NVMe M.2","mSATA","PCIe U.2","eMMC"]', '["SATA 2.5\"","NVMe M.2","mSATA","PCIe U.2","eMMC"]', null, 1),
('laptop-ssd', 'capacity_gb', 'Capacidade', 'Capacity', 'select', '["120GB","128GB","240GB","256GB","480GB","500GB","512GB","1TB","2TB","4TB"]', '["120GB","128GB","240GB","256GB","480GB","500GB","512GB","1TB","2TB","4TB"]', null, 2),
('laptop-ssd', 'form_factor', 'Factor de Forma', 'Form Factor', 'select', '["2.5\"","M.2 2242","M.2 2280","M.2 2230"]', '["2.5\"","M.2 2242","M.2 2280","M.2 2230"]', null, 3),
('laptop-ssd', 'smart_hours', 'Horas de Uso (S.M.A.R.T)', 'Hours Used (S.M.A.R.T)', 'number', null, null, 'h', 4),
('laptop-ssd', 'tbw_remaining', 'TBW Restante', 'TBW Remaining', 'number', null, null, 'TB', 5),
('laptop-ssd', 'health_percent', 'Saúde (%)', 'Health (%)', 'number', null, null, '%', 6),
-- RAM portátil
('laptop-ram', 'ram_type', 'Tipo', 'Type', 'select', '["DDR3","DDR4","DDR5","LPDDR4","LPDDR5","DDR3L"]', '["DDR3","DDR4","DDR5","LPDDR4","LPDDR5","DDR3L"]', null, 1),
('laptop-ram', 'capacity_gb', 'Capacidade', 'Capacity', 'select', '["2GB","4GB","8GB","16GB","32GB","64GB"]', '["2GB","4GB","8GB","16GB","32GB","64GB"]', null, 2),
('laptop-ram', 'frequency_mhz', 'Frequência', 'Frequency', 'select', '["1333MHz","1600MHz","2133MHz","2400MHz","2666MHz","3200MHz","4800MHz","5600MHz"]', '["1333MHz","1600MHz","2133MHz","2400MHz","2666MHz","3200MHz","4800MHz","5600MHz"]', null, 3),
('laptop-ram', 'format', 'Formato', 'Format', 'select', '["SO-DIMM","DIMM","On-board"]', '["SO-DIMM","DIMM","On-board"]', null, 4),
('laptop-ram', 'quantity_sticks', 'Número de Pentes', 'Number of Sticks', 'select', '["1","2","4"]', '["1","2","4"]', null, 5),
-- CPU desktop
('desktop-cpu', 'cpu_brand', 'Fabricante', 'Manufacturer', 'select', '["Intel","AMD","Apple"]', '["Intel","AMD","Apple"]', null, 1),
('desktop-cpu', 'cpu_series', 'Série', 'Series', 'text', null, null, null, 2),
('desktop-cpu', 'cpu_model', 'Modelo Completo', 'Full Model', 'text', null, null, null, 3),
('desktop-cpu', 'socket', 'Socket', 'Socket', 'select', '["LGA1151","LGA1200","LGA1700","AM4","AM5","LGA2011","TR4","BGA","Outro"]', '["LGA1151","LGA1200","LGA1700","AM4","AM5","LGA2011","TR4","BGA","Other"]', null, 4),
('desktop-cpu', 'cores', 'Núcleos', 'Cores', 'number', null, null, null, 5),
('desktop-cpu', 'threads', 'Threads', 'Threads', 'number', null, null, null, 6),
('desktop-cpu', 'base_freq_ghz', 'Frequência Base', 'Base Frequency', 'number', null, null, 'GHz', 7),
('desktop-cpu', 'boost_freq_ghz', 'Frequência Boost', 'Boost Frequency', 'number', null, null, 'GHz', 8),
('desktop-cpu', 'tdp_watts', 'TDP', 'TDP', 'number', null, null, 'W', 9),
('desktop-cpu', 'igpu', 'GPU Integrada', 'Integrated GPU', 'boolean', null, null, null, 10),
-- GPU
('desktop-gpu', 'gpu_brand', 'Fabricante', 'Manufacturer', 'select', '["Nvidia","AMD","Intel"]', '["Nvidia","AMD","Intel"]', null, 1),
('desktop-gpu', 'gpu_model', 'Modelo', 'Model', 'text', null, null, null, 2),
('desktop-gpu', 'vram_gb', 'VRAM', 'VRAM', 'select', '["2GB","4GB","6GB","8GB","10GB","12GB","16GB","20GB","24GB"]', '["2GB","4GB","6GB","8GB","10GB","12GB","16GB","20GB","24GB"]', null, 3),
('desktop-gpu', 'vram_type', 'Tipo VRAM', 'VRAM Type', 'select', '["GDDR5","GDDR6","GDDR6X","HBM2","HBM3"]', '["GDDR5","GDDR6","GDDR6X","HBM2","HBM3"]', null, 4),
('desktop-gpu', 'tdp_watts', 'TDP', 'TDP', 'number', null, null, 'W', 5),
('desktop-gpu', 'power_connectors', 'Conectores Alimentação', 'Power Connectors', 'select', '["Nenhum","6-pin","8-pin","6+8-pin","8+8-pin","16-pin (4x8)","12VHPWR"]', '["None","6-pin","8-pin","6+8-pin","8+8-pin","16-pin (4x8)","12VHPWR"]', null, 6),
('desktop-gpu', 'display_outputs', 'Saídas de Vídeo', 'Display Outputs', 'multiselect', '["HDMI 2.0","HDMI 2.1","DisplayPort 1.4","DisplayPort 2.0","DVI","VGA"]', '["HDMI 2.0","HDMI 2.1","DisplayPort 1.4","DisplayPort 2.0","DVI","VGA"]', null, 7),
-- Monitor
('peripheral-monitor', 'screen_size', 'Tamanho', 'Size', 'number', null, null, '"', 1),
('peripheral-monitor', 'resolution', 'Resolução', 'Resolution', 'select', '["1920x1080 FHD","2560x1440 QHD","3840x2160 4K","1280x1024","2560x1080 UW","3440x1440 UW","5120x1440 Super UW"]', '["1920x1080 FHD","2560x1440 QHD","3840x2160 4K","1280x1024","2560x1080 UW","3440x1440 UW","5120x1440 Super UW"]', null, 2),
('peripheral-monitor', 'panel_type', 'Tipo de Painel', 'Panel Type', 'select', '["IPS","VA","TN","OLED","Mini-LED"]', '["IPS","VA","TN","OLED","Mini-LED"]', null, 3),
('peripheral-monitor', 'refresh_hz', 'Taxa de Actualização', 'Refresh Rate', 'select', '["60Hz","75Hz","100Hz","120Hz","144Hz","165Hz","240Hz","280Hz","360Hz"]', '["60Hz","75Hz","100Hz","120Hz","144Hz","165Hz","240Hz","280Hz","360Hz"]', null, 4),
('peripheral-monitor', 'inputs', 'Entradas', 'Inputs', 'multiselect', '["HDMI 1.4","HDMI 2.0","HDMI 2.1","DisplayPort 1.4","DisplayPort 2.0","VGA","DVI","USB-C","Thunderbolt"]', '["HDMI 1.4","HDMI 2.0","HDMI 2.1","DisplayPort 1.4","DisplayPort 2.0","VGA","DVI","USB-C","Thunderbolt"]', null, 5),
('peripheral-monitor', 'stand_included', 'Base Incluída', 'Stand Included', 'boolean', null, null, null, 6),
('peripheral-monitor', 'dead_pixels', 'Pixels Mortos', 'Dead Pixels', 'number', null, null, null, 7),
-- Osciloscópio
('tool-oscilloscope', 'bandwidth_mhz', 'Largura de Banda', 'Bandwidth', 'number', null, null, 'MHz', 1),
('tool-oscilloscope', 'channels', 'Canais', 'Channels', 'select', '["2","4","8"]', '["2","4","8"]', null, 2),
('tool-oscilloscope', 'calibration_date', 'Última Calibração', 'Last Calibration', 'date', null, null, null, 3),
('tool-oscilloscope', 'next_calibration', 'Próxima Calibração', 'Next Calibration', 'date', null, null, null, 4),
-- Estação de solda
('tool-soldering', 'max_temp', 'Temperatura Máxima', 'Max Temperature', 'number', null, null, '°C', 1),
('tool-soldering', 'tip_types', 'Tipos de Ponta', 'Tip Types', 'text', null, null, null, 2),
('tool-soldering', 'has_hotair', 'Tem Hot Air', 'Has Hot Air', 'boolean', null, null, null, 3),
-- Impressora de etiquetas
('tool-printer', 'printer_type', 'Tipo de Impressora', 'Printer Type', 'select', '["Etiquetas Térmicas","Etiquetas Inkjet","Laser","Inkjet","Zebra/Dymo"]', '["Thermal Labels","Inkjet Labels","Laser","Inkjet","Zebra/Dymo"]', null, 1),
('tool-printer', 'label_width_mm', 'Largura Etiqueta', 'Label Width', 'number', null, null, 'mm', 2),
('tool-printer', 'connectivity', 'Conectividade', 'Connectivity', 'multiselect', '["USB","WiFi","Bluetooth","Ethernet"]', '["USB","WiFi","Bluetooth","Ethernet"]', null, 3),
-- Consumíveis — estanho
('consumable-solder', 'diameter_mm', 'Diâmetro', 'Diameter', 'select', '["0.3mm","0.5mm","0.6mm","0.8mm","1.0mm","1.5mm"]', '["0.3mm","0.5mm","0.6mm","0.8mm","1.0mm","1.5mm"]', null, 1),
('consumable-solder', 'composition', 'Composição', 'Composition', 'select', '["Sn63/Pb37 (60/40)","Sn96.5/Ag3/Cu0.5 (SAC305)","Sn99.3/Cu0.7","Sem Chumbo","Outro"]', '["Sn63/Pb37 (60/40)","Sn96.5/Ag3/Cu0.5 (SAC305)","Sn99.3/Cu0.7","Lead-free","Other"]', null, 2),
('consumable-solder', 'weight_g', 'Peso', 'Weight', 'number', null, null, 'g', 3),
-- Lote
('lot-untriaged', 'lot_number', 'Número do Lote', 'Lot Number', 'text', null, null, null, 1),
('lot-untriaged', 'estimated_items', 'Items Estimados', 'Estimated Items', 'number', null, null, null, 2),
('lot-untriaged', 'triaged_percent', 'Triagem Concluída', 'Triaging Complete', 'number', null, null, '%', 3),
('lot-untriaged', 'lot_source', 'Origem do Lote', 'Lot Source', 'select', '["eBay","Facebook Marketplace","Gumtree","Empresa","Particular","Leilão","Outro"]', '["eBay","Facebook Marketplace","Gumtree","Company","Private","Auction","Other"]', null, 4)
ON CONFLICT DO NOTHING;
