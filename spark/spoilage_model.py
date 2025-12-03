"""
Modelo de Previsão de Deterioração de Grãos
Com Random Forest + Regressão Logística
Baseado em pesquisa agrícola 2024-2025
"""

import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from datetime import datetime, timedelta
import math


class GrainSpoilagePredictor:
    """
    Prediz probabilidade de deterioração (0-1) nas próximas 24h
    
    Critério de Risco Baseado em Literatura Agrícola[1]:
    - Temperatura ideal: 25-60°F (-4 a 15°C) [SEGURO]
    - Zona CRÍTICA: Temp > 70°F (21°C) E Umidade > 65% [RISCO MUITO ALTO]
    - Zona ALERTA: Temp > 65°F (18°C) E Umidade > 70% [RISCO ALTO]
    - Zona MODERADA: Variações cíclicas de temperatura com alta umidade
    
    Features usados:
    1. avg_temperature: Temperatura média (°C)
    2. avg_humidity: Umidade relativa média (%)
    3. avg_co2_ppm: Qualidade do ar / atividade biológica (ppm)
    4. temp_humidity_interaction: Temp × Umidade (produto)
    5. temp_variability: Desvio padrão da temperatura (°C)
    6. humid_variability: Desvio padrão da umidade (%)
    7. co2_trend: Tendência de CO2 (indica respiração/atividade microbiana)
    8. consecutive_high_humidity_periods: Períodos consecutivos com umidade alta
    9. temp_elevation_from_safe: (Temp - 15) se Temp > 15, senão 0
    10. critical_zone_duration: Quantos minutos na zona crítica (%)
    """
    
    def __init__(self, model_path=None):
        """
        Inicializa o modelo.
        
        Args:
            model_path: Caminho do modelo treinado (se existir)
        """
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = [
            'avg_temperature',
            'avg_humidity',
            'avg_co2_ppm',
            'temp_humidity_interaction',
            'temp_variability',
            'humid_variability',
            'co2_trend',
            'consecutive_high_humidity_periods',
            'temp_elevation_from_safe',
            'critical_zone_duration'
        ]
        self.is_fitted = False
        
        if model_path:
            self.load_model(model_path)
    
    def _extract_features_from_aggregates(self, data_point: dict) -> dict:
        """
        Extrai features do ponto de dados agregado (janela de 5 minutos)
        
        Args:
            data_point: {
                'averageTemperature': float,
                'averageHumidity': float,
                'averageAirQuality': float (CO2 ppm),
                'stdTemperature': float,
                'stdHumidity': float,
                'percentOverTempLimit': float,  # % de leituras > limite
                'percentOverHumLimit': float,
                'averageAirQuality': float  # CO2 ppm
            }
        
        Returns:
            dict com features
        """
        temp = data_point.get('averageTemperature', 20.0)
        hum = data_point.get('averageHumidity', 50.0)
        co2 = data_point.get('averageAirQuality', 400.0)
        std_temp = data_point.get('stdTemperature', 0.0)
        std_hum = data_point.get('stdHumidity', 0.0)
        pct_over_temp = data_point.get('percentOverTempLimit', 0.0)
        pct_over_hum = data_point.get('percentOverHumLimit', 0.0)
        
        # Sanitizar valores
        temp = float(temp) if temp else 20.0
        hum = float(hum) if hum else 50.0
        co2 = float(co2) if co2 else 400.0
        std_temp = float(std_temp) if std_temp else 0.0
        std_hum = float(std_hum) if std_hum else 0.0
        pct_over_temp = float(pct_over_temp) if pct_over_temp else 0.0
        pct_over_hum = float(pct_over_hum) if pct_over_hum else 0.0
        
        # Feature 1: Temperatura média
        avg_temp = temp
        
        # Feature 2: Umidade média
        avg_humidity = hum
        
        # Feature 3: CO2 médio
        avg_co2 = co2
        
        # Feature 4: Interação Temp × Umidade (crítica para spoilage)
        # Quanto maior a umidade E quanto maior a temp, maior o risco
        temp_humidity_interaction = (temp / 20.0) * (hum / 100.0)
        
        # Feature 5: Variabilidade de temperatura
        temp_variability = std_temp
        
        # Feature 6: Variabilidade de umidade
        humid_variability = std_hum
        
        # Feature 7: Tendência de CO2
        # Aumento de CO2 = atividade biológica = risco
        co2_trend = (co2 - 400.0) / 100.0  # 400 = CO2 normal, acima = problema
        co2_trend = max(0, co2_trend)  # Apenas positivo
        
        # Feature 8: Períodos consecutivos com umidade alta
        # Baseado em percentOverHumLimit
        consecutive_high_humidity = pct_over_hum / 100.0
        
        # Feature 9: Elevação de temperatura da zona segura (< 15°C)
        # Quanto mais acima de 15°C, pior
        safe_temp_threshold = 15.0
        temp_elevation = max(0, temp - safe_temp_threshold) / 10.0
        
        # Feature 10: Duração na zona crítica
        # Zona crítica = Temp > 21°C E Umidade > 65%
        in_critical_zone = 1.0 if (temp > 21.0 and hum > 65.0) else 0.0
        critical_zone_duration = in_critical_zone * (pct_over_temp / 100.0) * (pct_over_hum / 100.0)
        
        return {
            'avg_temperature': avg_temp,
            'avg_humidity': avg_humidity,
            'avg_co2_ppm': avg_co2,
            'temp_humidity_interaction': temp_humidity_interaction,
            'temp_variability': temp_variability,
            'humid_variability': humid_variability,
            'co2_trend': co2_trend,
            'consecutive_high_humidity_periods': consecutive_high_humidity,
            'temp_elevation_from_safe': temp_elevation,
            'critical_zone_duration': critical_zone_duration
        }
    
    def train_model(self, X_train: list, y_train: list):
        """
        Treina o modelo com dados históricos.
        
        Args:
            X_train: Lista de dicts com features
            y_train: Lista de labels (0 = sem deterioração, 1 = deterioração ocorreu)
        """
        # Converter para array
        X = np.array([[x[f] for f in self.feature_names] for x in X_train])
        y = np.array(y_train)
        
        # Criar pipeline
        self.model = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ))
        ])
        
        self.model.fit(X, y)
        self.is_fitted = True
        print(" Modelo de spoilage treinado com sucesso!")
    
    def predict_spoilage_risk(self, data_point: dict) -> float:
        """
        Prediz probabilidade de deterioração (0-1) para as próximas 24h.
        
        Args:
            data_point: Dados agregados do período (janela 5 min)
        
        Returns:
            float: Probabilidade 0.0-1.0 (0% = seguro, 100% = risco crítico)
        """
        if not self.is_fitted and self.model is None:
            # Usar heurística se modelo não está treinado
            return self._predict_heuristic(data_point)
        
        features = self._extract_features_from_aggregates(data_point)
        X = np.array([[features[f] for f in self.feature_names]])
        
        try:
            # Probabilidade da classe 1 (deterioração)
            proba = self.model.predict_proba(X)[0][1]
            return float(proba)
        except Exception as e:
            print(f" Erro ao predizer spoilage: {e}, usando heurística")
            return self._predict_heuristic(data_point)
    
    def _predict_heuristic(self, data_point: dict) -> float:
        """
        Heurística baseada em literatura agrícola quando modelo não está pronto.
        Referências: [source:2] [source:5]
        
        Regras:
        - Temp > 25°C E Umidade > 75% → Risco CRÍTICO (0.8-1.0)
        - Temp > 20°C E Umidade > 70% → Risco ALTO (0.6-0.8)
        - Variações cíclicas E Umidade > 70% → Risco MODERADO (0.4-0.6)
        - Caso contrário → Risco BAIXO (0.0-0.4)
        """
        features = self._extract_features_from_aggregates(data_point)
        
        temp = features['avg_temperature']
        hum = features['avg_humidity']
        co2 = features['avg_co2_ppm']
        temp_var = features['temp_variability']
        
        risk = 0.0
        
        # Zona crítica (dados agrícolas mostram deterioração rápida aqui)
        if temp > 25 and hum > 75:
            risk = min(1.0, 0.85 + (co2 - 400) / 1000)  # 0.85-1.0
        
        # Zona de alto risco
        elif temp > 20 and hum > 70:
            risk = min(0.8, 0.60 + (temp - 20) * 0.05 + (hum - 70) * 0.01)  # 0.60-0.80
        
        # Zona moderada (variações térmicas aceleram spoilage)
        elif hum > 65 and temp_var > 2:
            risk = min(0.65, 0.40 + temp_var * 0.1)  # 0.40-0.65
        
        # Zona moderada (só umidade alta)
        elif hum > 70:
            risk = min(0.55, 0.30 + (hum - 70) * 0.05)  # 0.30-0.55
        
        # Zona segura
        else:
            risk = max(0.0, (hum - 50) * 0.005)  # 0.0-0.1
        
        return min(1.0, max(0.0, risk))
    
    def save_model(self, path: str):
        """Salva o modelo treinado."""
        if self.model is None:
            print(" Nenhum modelo para salvar!")
            return
        with open(path, 'wb') as f:
            pickle.dump(self.model, f)
        print(f" Modelo salvo em {path}")
    
    def load_model(self, path: str):
        """Carrega modelo treinado."""
        try:
            with open(path, 'rb') as f:
                self.model = pickle.load(f)
            self.is_fitted = True
            print(f" Modelo carregado de {path}")
        except Exception as e:
            print(f" Erro ao carregar modelo: {e}")
    
    @staticmethod
    def get_risk_category(probability: float) -> tuple:
        """
        Converte probabilidade em categoria legível.
        
        Returns:
            (category_name, color_code, recommended_action)
        """
        if probability >= 0.8:
            return ("CRÍTICO", "🔴", "AÇÃO IMEDIATA: Aumentar aeration, verificar umidade")
        elif probability >= 0.6:
            return ("ALTO", "🟠", "Monitorar continuamente, considerar aeration")
        elif probability >= 0.4:
            return ("MODERADO", "🟡", "Atenção, ajustar ventilação se necessário")
        else:
            return ("BAIXO", "🟢", "Condições seguras")


# Exemplo de uso:
if __name__ == "__main__":
    # Inicializar preditor
    predictor = GrainSpoilagePredictor()
    
    # Exemplo de ponto de dados
    sample_data = {
        'averageTemperature': 24.5,
        'averageHumidity': 72.0,
        'averageAirQuality': 520.0,  # CO2 elevado
        'stdTemperature': 1.2,
        'stdHumidity': 3.5,
        'percentOverTempLimit': 30.0,
        'percentOverHumLimit': 45.0
    }
    
    risk_prob = predictor.predict_spoilage_risk(sample_data)
    category, emoji, action = predictor.get_risk_category(risk_prob)
    
    print(f"\n Probabilidade de Deterioração: {risk_prob:.2%}")
    print(f" Categoria: {emoji} {category}")
    print(f" Ação recomendada: {action}")
