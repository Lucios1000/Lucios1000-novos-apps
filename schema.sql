-- 1. Tabela de Motoristas
CREATE TABLE IF NOT EXISTS motoristas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    status TEXT DEFAULT 'ativo',
    taxa_adesao_paga BOOLEAN DEFAULT 0,
    saldo_a_receber REAL DEFAULT 0.00
);

-- 2. Tabela de Horários e Multiplicadores (Para automação das Tabelas 1.0 a 1.3)
CREATE TABLE IF NOT EXISTS grade_horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    periodo TEXT, -- Ex: Madrugada, Pico, Normal
    hora_inicio TIME,
    hora_fim TIME,
    multiplicador REAL -- Ex: 1.20
);

-- 3. Tabela Principal de Corridas (Onde o DRE nasce)
CREATE TABLE IF NOT EXISTS historico_corridas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motorista_id INTEGER,
    valor_total_pago REAL, -- Valor do Slider
    km_distancia REAL,
    taxa_app_valor REAL, -- Os 15% calculados na hora
    custo_gateway REAL, -- Os 2.5% 
    custos_fixos_totais REAL, -- Soma do Seguro + Manutencao + Provisao 
    liquido_motorista REAL,
    data_corrida DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id)
);

-- Inserindo os multiplicadores base
INSERT INTO grade_horarios (periodo, hora_inicio, hora_fim, multiplicador) VALUES 
('Madrugada', '00:00', '05:59', 1.2),
('Normal', '06:00', '17:59', 1.0),
('Pico', '18:00', '20:59', 1.1),
('Noite', '21:00', '23:59', 1.2);

-- 4. Refinando a Tabela de Motoristas (com campos reais)
CREATE TABLE IF NOT EXISTS motoristas_cadastro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    telefone TEXT,
    veiculo_modelo TEXT,
    placa TEXT UNIQUE,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pendente' -- pendente, ativo, bloqueado
);

-- 5. Criando a Tabela de Clientes (Passageiros)
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    telefone TEXT UNIQUE NOT NULL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_corridas INTEGER DEFAULT 0,
    nota_media REAL DEFAULT 5.0
);