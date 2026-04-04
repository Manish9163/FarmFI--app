import requests
from config import Config
from utils.db import get_db


class WeatherService:
    def get_weather(self, location: str, user_id: int = None) -> dict:
        """Fetch current weather from WeatherAPI and optionally log it."""
        if not Config.WEATHER_API_KEY:
            return self._mock_weather(location)

        try:
            resp = requests.get(
                f"{Config.WEATHER_BASE_URL}/forecast.json",
                params={
                    'q': location,
                    'key': Config.WEATHER_API_KEY,
                    'days': 7,
                    'aqi': 'yes'
                },
                timeout=5,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            return {'error': str(e)}

        weather = self._map_weatherapi_response(data, fallback_location=location)

        self._log(weather, user_id)
        return weather

    def get_weather_by_coords(self, lat: float, lon: float, user_id: int = None) -> dict:
        if not Config.WEATHER_API_KEY:
            return self._mock_weather('Current Location')

        try:
            resp = requests.get(
                f"{Config.WEATHER_BASE_URL}/forecast.json",
                params={
                    'q': f'{lat},{lon}',
                    'key': Config.WEATHER_API_KEY,
                    'days': 7,
                    'aqi': 'yes'
                },
                timeout=5,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            return {'error': str(e)}

        weather = self._map_weatherapi_response(data, fallback_location=f'{lat},{lon}')
        self._log(weather, user_id)
        return weather

    def get_logs(self, user_id: int, limit: int = 10) -> list:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM weather_logs WHERE user_id = %s ORDER BY logged_at DESC LIMIT %s",
                (user_id, limit)
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    def _log(self, weather: dict, user_id):
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO weather_logs (user_id, location, latitude, longitude, "
                "temperature, humidity, rainfall, wind_speed, description) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    user_id,
                    weather['location'],
                    weather.get('lat'),
                    weather.get('lon'),
                    weather['temperature'],
                    weather['humidity'],
                    weather['rainfall'],
                    weather['wind_speed'],
                    weather['description'],
                )
            )
            conn.commit()
            return cursor.lastrowid
        except Exception:
            conn.rollback()
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def _map_weatherapi_response(data: dict, fallback_location: str) -> dict:
        location = data.get('location', {})
        current = data.get('current', {})

        forecast_data = []
        forecasts = data.get('forecast', {}).get('forecastday', [])
        for day in forecasts:
            day_stats = day.get('day', {})
            forecast_data.append({
                'date': day.get('date'),
                'max_temp': day_stats.get('maxtemp_c'),
                'min_temp': day_stats.get('mintemp_c'),
                'condition': day_stats.get('condition', {}).get('text', 'Unknown'),
                'chance_of_rain': day_stats.get('daily_chance_of_rain', 0),
                'icon': day_stats.get('condition', {}).get('icon', ''),
            })



        city_name = location.get('name', fallback_location)
        region = location.get('region', '')
        country = location.get('country', '')
        # "City, Region, Country"
        full_location_parts = [city_name]
        if region and region != city_name:
            full_location_parts.append(region)
        if country:
            full_location_parts.append(country)
        full_location = ', '.join(full_location_parts)

        current_icon = current.get('condition', {}).get('icon', '')

        return {
            'location':      city_name,
            'full_location': full_location,
            'region':        region,
            'country':       country,
            'temperature':   current.get('temp_c', 0),
            'humidity':      current.get('humidity', 0),
            'rainfall':      current.get('precip_mm', 0),
            'wind_speed':    current.get('wind_kph', 0),
            'description':   current.get('condition', {}).get('text', 'Unknown'),
            'icon':          current_icon,
            'air_quality':   current.get('air_quality', {}),
            'aqi_index':     current.get('air_quality', {}).get('us-epa-index', 1),
            'lat':           location.get('lat', 0),
            'lon':           location.get('lon', 0),
            'localtime':     location.get('localtime', ''),
            'forecast':      forecast_data,
        }

    @staticmethod
    def _mock_weather(location: str) -> dict:
        """Fallback when no API key is configured."""
        from datetime import datetime, timedelta
        today = datetime.now()
        
        forecast = []
        for i in range(7):
            date = (today + timedelta(days=i)).strftime('%Y-%m-%d')
            chance_of_rain = 80 if i == 2 else (60 if i == 4 else 10)
            max_temp = 38.5 if i == 3 else 32.5
            
            forecast.append({
                'date': date,
                'max_temp': max_temp,
                'min_temp': 20.0,
                'condition': 'Rainy' if chance_of_rain > 50 else 'Sunny',
                'chance_of_rain': chance_of_rain,
                'icon': '',
            })
            
        return {
            'location':      location,
            'full_location': f'{location} (Demo)',
            'region':        '',
            'country':       'Demo',
            'temperature':   28.5,
            'humidity':      72.0,
            'rainfall':      5.2,
            'wind_speed':    3.4,
            'description':   'Partly Cloudy (Demo)',
            'icon':          '',
            'air_quality':   {'us-epa-index': 2, 'pm2_5': 15.5},
            'aqi_index':     2,
            'lat': 0, 'lon': 0,
            'localtime':     today.strftime('%Y-%m-%d %H:%M'),
            'forecast':      forecast,
        }

