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
('Normal', '06:00', '18:00', 1.0),
('Pico', '18:00', '21:00', 1.1),
('Madrugada', '00:00', '05:59', 1.2);