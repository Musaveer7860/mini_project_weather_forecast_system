const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const SearchHistory = require('./models/SearchHistory');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let isMongoConnected = false;
const inMemoryHistory = [];

const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('MongoDB Connected Successfully');
      isMongoConnected = true;
    })
    .catch((err) => {
      console.error('MongoDB Connection Failed. Falling back to In-Memory storage.', err.message);
    });
} else {
  console.warn('MONGO_URI not found in environment. Falling back to In-Memory storage.');
}

function normalizeCityName(name) {
  if (!name) return '';
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getCityHash(city) {
  let hash = 0;
  for (let i = 0; i < city.length; i++) {
    hash = city.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function generateHistoricalData(city, currentTemp, hash, timezoneOffsetSeconds, lat) {
  const offsetMs = (timezoneOffsetSeconds || 0) * 1000;
  const cityCurrentTime = new Date(Date.now() + offsetMs);
  const historical = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const currentMonth = cityCurrentTime.getUTCMonth();
  const seasonFactor = Math.cos((currentMonth - 5) / 6 * Math.PI);
  
  const actualLat = lat !== undefined ? lat : ((hash % 50) * (hash % 2 === 0 ? 1 : -1));
  const isNorthern = actualLat >= 0;
  const absLat = Math.abs(actualLat);
  
  const baseEquatorTemp = 27;
  const latEffect = absLat * 0.38;
  const seasonalAmplitude = absLat * 0.28;
  
  let baseClimateTemp = baseEquatorTemp - latEffect;
  if (isNorthern) {
    baseClimateTemp += seasonFactor * seasonalAmplitude;
  } else {
    baseClimateTemp -= seasonFactor * seasonalAmplitude;
  }

  for (let i = 1; i <= 5; i++) {
    const pastDate = new Date(cityCurrentTime.getTime() - i * 24 * 60 * 60 * 1000);
    const monthStr = months[pastDate.getUTCMonth()];
    const dayStr = pastDate.getUTCDate();
    const dateStr = `${monthStr} ${dayStr}`;
    const dayHash = getCityHash(`${normalizeCityName(city)}|${dateStr}`);
    const variance = (Math.sin(dayHash) * 1000) % 3.0;
    const temp = Math.round((baseClimateTemp + variance) * 10) / 10;
    
    let condition = 'Clear';
    if (temp <= 2) {
      const histConds = ['Snow', 'Clouds'];
      condition = histConds[dayHash % histConds.length];
    } else {
      const histConds = ['Clear', 'Clouds', 'Rain', 'Drizzle'];
      condition = histConds[dayHash % histConds.length];
    }
    let humidity = 50 + (dayHash % 30);
    let windSpeed = 2.0 + ((dayHash % 30) / 10);
    if (condition === 'Clear') {
      humidity = 30 + (dayHash % 25);
      windSpeed = 1.0 + ((dayHash % 30) / 10);
    } else if (condition === 'Clouds') {
      humidity = 55 + (dayHash % 25);
      windSpeed = 1.5 + ((dayHash % 40) / 10);
    } else if (condition === 'Rain' || condition === 'Drizzle') {
      humidity = 80 + (dayHash % 18);
      windSpeed = 3.0 + ((dayHash % 50) / 10);
    } else if (condition === 'Snow') {
      humidity = 75 + (dayHash % 15);
      windSpeed = 2.0 + ((dayHash % 40) / 10);
    }
    windSpeed = Math.round(windSpeed * 10) / 10;
    historical.push({
      date: dateStr,
      temp,
      condition,
      humidity,
      windSpeed
    });
  }
  return historical.reverse();
}

function getWeatherAdvice(city, temp, condition, humidity, windSpeed, aqi, uv, visibility) {
  const cond = condition.toLowerCase();
  let intro = '';
  const hash = getCityHash(city + condition);
  
  if (cond.includes('thunderstorm')) {
    const intros = [
      `Thunderstorms are active across ${city}, creating highly unstable atmospheric conditions.`,
      `Severe storm cells are moving through ${city}, bringing sudden electrical discharge and heavy downpours.`,
      `Unstable weather is dominating ${city} today with active lightning and thunderstorm activity.`
    ];
    intro = intros[hash % intros.length];
  } else if (cond.includes('snow')) {
    const intros = [
      `A blanket of snow is falling over ${city}, creating typical winter conditions.`,
      `Snowfall is actively accumulating across ${city}, turning the area into a winter landscape.`,
      `${city} is experiencing active winter snow showers, reducing surface friction on pathways.`
    ];
    intro = intros[hash % intros.length];
  } else if (cond.includes('rain')) {
    const intros = [
      `Steady rain is falling in ${city}, wetting roads and pathways.`,
      `Rain showers are sweeping across ${city} today.`,
      `Persistent precipitation is active throughout ${city}, making outdoor paths slick.`
    ];
    intro = intros[hash % intros.length];
  } else if (cond.includes('drizzle')) {
    const intros = [
      `Light drizzle and damp mist are hanging in the air across ${city}.`,
      `${city} is experiencing fine, persistent drizzle today.`,
      `A damp mist with intermittent drizzle is covering ${city}.`
    ];
    intro = intros[hash % intros.length];
  } else if (cond.includes('clear') || cond.includes('sunny')) {
    const intros = [
      `${city} is basking under clear skies with excellent visibility.`,
      `Bright sunshine and clear blue skies are dominating the day in ${city}.`,
      `Sunny conditions with minimal cloud cover are reported in ${city}.`
    ];
    intro = intros[hash % intros.length];
  } else if (cond.includes('cloud')) {
    const intros = [
      `Overcast cloud cover is spreading across the skies of ${city}.`,
      `Gray skies and thick cloud layers are covering ${city} today.`,
      `Overcast, cloudy conditions are dominating the local weather pattern in ${city}.`
    ];
    intro = intros[hash % intros.length];
  } else if (cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) {
    const intros = [
      `A layer of mist and haze is reducing atmospheric visibility in ${city}.`,
      `Foggy conditions and damp haze are settling over ${city} today.`,
      `Atmospheric haze and mist are active across the ${city} region.`
    ];
    intro = intros[hash % intros.length];
  } else {
    intro = `${city} is experiencing typical ${condition} conditions today.`;
  }

  let tempTip = '';
  if (temp > 35) {
    tempTip = ` The temperature is a blistering ${temp}°C. There is an active heatwave advisory: stay indoors in air-conditioned areas, wear loose clothing, and avoid any outdoor activities to prevent heat exhaustion.`;
  } else if (temp >= 28 && temp <= 35) {
    tempTip = ` It feels hot at ${temp}°C. If you go outside, seek shade, wear lightweight fabrics, sunglasses, and carry a water bottle to stay hydrated.`;
  } else if (temp >= 18 && temp <= 27) {
    tempTip = ` Temperatures are highly pleasant at ${temp}°C. It is an excellent day for outdoor recreation, running, sightseeing, or dining al fresco.`;
  } else if (temp >= 10 && temp <= 17) {
    tempTip = ` The air is brisk at ${temp}°C. A light jacket, windbreaker, or sweater is recommended if you plan to walk outdoors.`;
  } else if (temp >= 0 && temp <= 9) {
    tempTip = ` It's chilly at ${temp}°C. Bundle up in layers, wear a scarf, and protect yourself against the cold air if heading outside.`;
  } else {
    tempTip = ` Sub-zero temperatures detected at ${temp}°C. Severe freeze warning: dress in heavy insulated winter coats, gloves, and be cautious of slippery black ice on roads and pavements.`;
  }

  let dynamicDetail = '';
  if (windSpeed > 8) {
    dynamicDetail = ` High wind speeds of ${windSpeed} m/s are active. Hold onto umbrellas firmly, secure loose outdoor objects, and drivers should expect crosswinds.`;
  } else if (humidity > 75) {
    dynamicDetail = ` The humidity level is very high at ${humidity}%, making the air feel damp and heavy.`;
  } else if (humidity < 25) {
    dynamicDetail = ` The humidity is exceptionally low at ${humidity}%, making the air dry. Consider using moisturizer and keeping hydrated to prevent dry skin.`;
  } else if (visibility !== undefined && visibility < 3) {
    dynamicDetail = ` Visibility is limited to only ${visibility} km due to atmospheric conditions. Use low-beam fog lights and drive with caution.`;
  }

  let safetyAlerts = '';
  if (uv !== undefined && uv >= 6) {
    safetyAlerts += ` The UV index is high (${uv}). Ensure you apply SPF 30+ sunscreen, wear a wide-brimmed hat, and limit direct sun exposure.`;
  }
  if (aqi && aqi >= 3) {
    if (aqi === 3) {
      safetyAlerts += ` Air quality is Moderate (AQI ${aqi}). Sensitive groups should limit intense outdoor exercises.`;
    } else {
      safetyAlerts += ` Warning: Air quality is Poor (AQI ${aqi}). It is highly advised to wear a protective mask (N95) outdoors and keep windows closed.`;
    }
  }

  return `${intro}${tempTip}${dynamicDetail}${safetyAlerts}`;
}

function generateMockWeather(city) {
  const hash = getCityHash(city);
  const mockLat = (hash % 120) - 60;

  const temp = Math.round(((hash % 45) - 10) * 10) / 10;
  const feelsLike = Math.round((temp + (hash % 3) - 1.2) * 10) / 10;
  const tempMin = Math.round((temp - 2 - (hash % 3)) * 10) / 10;
  const tempMax = Math.round((temp + 2 + (hash % 3)) * 10) / 10;

  let conditions, descriptions;
  if (temp <= 2) {
    conditions = ['Snow', 'Clouds'];
    descriptions = ['light snow', 'overcast clouds'];
  } else {
    conditions = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm'];
    descriptions = ['clear sky', 'broken clouds', 'moderate rain', 'light intensity drizzle', 'thunderstorm with rain'];
  }
  
  const idx = hash % conditions.length;
  const condition = conditions[idx];
  const description = descriptions[idx];
  let humidity = 50 + (hash % 30);
  let windSpeed = 2.0 + ((hash % 30) / 10);
  if (condition === 'Clear') {
    humidity = 30 + (hash % 25);
    windSpeed = 1.0 + ((hash % 30) / 10);
  } else if (condition === 'Clouds') {
    humidity = 55 + (hash % 25);
    windSpeed = 1.5 + ((hash % 40) / 10);
  } else if (condition === 'Rain' || condition === 'Drizzle' || condition === 'Thunderstorm') {
    humidity = 80 + (hash % 18);
    windSpeed = 3.0 + ((hash % 50) / 10);
  } else if (condition === 'Snow') {
    humidity = 75 + (hash % 15);
    windSpeed = 2.0 + ((hash % 40) / 10);
  }
  windSpeed = Math.round(windSpeed * 10) / 10;
  const windDeg = hash % 360;
  const pressure = 1005 + (hash % 20);
  const visibility = 5 + (hash % 6);
  const aqi = 1 + (hash % 5);
  const aqiComponents = {
    co: 200 + (hash % 150),
    no2: 10 + (hash % 30),
    o3: 20 + (hash % 60),
    pm2_5: 5 + (hash % 25),
    pm10: 10 + (hash % 40)
  };
  let icon = '01d';
  if (condition === 'Clouds') icon = '03d';
  else if (condition === 'Rain') icon = '10d';
  else if (condition === 'Drizzle') icon = '09d';
  else if (condition === 'Thunderstorm') icon = '11d';
  else if (condition === 'Snow') icon = '13d';
  const timezone = new Date().getTimezoneOffset() * -60;
  const offsetMs = timezone * 1000;
  const cityCurrentTime = new Date(Date.now() + offsetMs);
  const localHour = cityCurrentTime.getUTCHours();
  const localMinute = cityCurrentTime.getUTCMinutes();
  const localTimeDecimal = localHour + localMinute / 60;

  let cloudFactor = 1.0;
  if (condition === 'Clouds') cloudFactor = 0.5;
  else if (condition === 'Rain') cloudFactor = 0.2;
  else if (condition === 'Drizzle') cloudFactor = 0.4;
  else if (condition === 'Thunderstorm') cloudFactor = 0.2;
  else if (condition === 'Snow') cloudFactor = 0.3;

  let uv = 0;
  if (localTimeDecimal >= 6 && localTimeDecimal <= 18) {
    const timeFactor = Math.sin((localTimeDecimal - 6) / 12 * Math.PI);
    const maxUv = 3 + (hash % 8);
    uv = Math.round(maxUv * timeFactor * cloudFactor * 10) / 10;
  }

  const forecast = [];
  for (let i = 0; i < 7; i++) {
    const forecastDate = new Date(cityCurrentTime.getTime() + i * 24 * 60 * 60 * 1000);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${weekdays[forecastDate.getUTCDay()]}, ${months[forecastDate.getUTCMonth()]} ${forecastDate.getUTCDate()}`;
    
    const dayHash = hash + i;
    const dayTempMin = Math.round((temp - 3 - (dayHash % 4)) * 10) / 10;
    const dayTempMax = Math.round((temp + 3 + (dayHash % 4)) * 10) / 10;
    const avgDayTemp = (dayTempMin + dayTempMax) / 2;
    
    let dayCondition = 'Clear';
    if (avgDayTemp <= 2) {
      const forecastConds = ['Snow', 'Clouds'];
      dayCondition = forecastConds[dayHash % forecastConds.length];
    } else {
      const forecastConds = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm'];
      dayCondition = forecastConds[dayHash % forecastConds.length];
    }
    
    let dayIcon = '01d';
    if (dayCondition === 'Clouds') dayIcon = '03d';
    else if (dayCondition === 'Rain') dayIcon = '10d';
    else if (dayCondition === 'Drizzle') dayIcon = '09d';
    else if (dayCondition === 'Thunderstorm') dayIcon = '11d';
    else if (dayCondition === 'Snow') dayIcon = '13d';

    forecast.push({
      dt: Math.floor(forecastDate.getTime() / 1000),
      date: dateStr,
      tempMin: dayTempMin,
      tempMax: dayTempMax,
      condition: dayCondition,
      icon: dayIcon
    });
  }

  const hourly = [];
  for (let i = 0; i < 6; i++) {
    const itemTimeMs = Date.now() + (i * 3 * 3600 * 1000);
    const itemDt = Math.floor(itemTimeMs / 1000);
    const hourTemp = Math.round((temp - (i * 0.4) + ((hash + i) % 2) - 0.5) * 10) / 10;
    
    let hourlyCondition = condition;
    let hourlyIcon = icon;
    if (i > 2) {
      if (hourTemp <= 2) {
        const hourlyConds = ['Snow', 'Clouds'];
        hourlyCondition = hourlyConds[(hash + i) % hourlyConds.length];
      } else {
        const hourlyConds = ['Clear', 'Clouds', 'Rain', 'Drizzle'];
        hourlyCondition = hourlyConds[(hash + i) % hourlyConds.length];
      }
      
      if (hourlyCondition === 'Clouds') hourlyIcon = '03d';
      else if (hourlyCondition === 'Rain') hourlyIcon = '10d';
      else if (hourlyCondition === 'Clear') hourlyIcon = '01d';
      else if (hourlyCondition === 'Drizzle') hourlyIcon = '09d';
      else if (hourlyCondition === 'Snow') hourlyIcon = '13d';
    }

    hourly.push({
      dt: itemDt,
      time: i === 0 ? 'Now' : '',
      temp: hourTemp,
      condition: hourlyCondition,
      icon: hourlyIcon
    });
  }

  const historical = generateHistoricalData(city, temp, hash, timezone, mockLat);
  const weatherAdvice = getWeatherAdvice(city, temp, condition, humidity, windSpeed, aqi, uv, visibility);

  return {
    city: normalizeCityName(city.charAt(0).toUpperCase() + city.slice(1)),
    temp,
    feelsLike,
    tempMin,
    tempMax,
    condition,
    description,
    humidity,
    windSpeed,
    windDeg,
    pressure,
    visibility,
    icon,
    aqi,
    aqiComponents,
    uv,
    forecast,
    hourly,
    historical,
    weatherAdvice,
    timezone,
    isMock: true
  };
}

function processForecastData(list, timezoneOffsetSeconds, city) {
  const dailyData = {};
  const offsetMs = (timezoneOffsetSeconds || 0) * 1000;
  
  list.forEach(item => {
    const cityLocalDate = new Date((item.dt * 1000) + offsetMs);
    const dateKey = `${cityLocalDate.getUTCFullYear()}-${cityLocalDate.getUTCMonth()}-${cityLocalDate.getUTCDate()}`;
    const hour = cityLocalDate.getUTCHours();
    
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        tempMin: item.main.temp_min,
        tempMax: item.main.temp_max,
        item: item
      };
    } else {
      if (item.main.temp_min < dailyData[dateKey].tempMin) {
        dailyData[dateKey].tempMin = item.main.temp_min;
      }
      if (item.main.temp_max > dailyData[dateKey].tempMax) {
        dailyData[dateKey].tempMax = item.main.temp_max;
      }
      const existingCityLocalDate = new Date((dailyData[dateKey].item.dt * 1000) + offsetMs);
      if (Math.abs(hour - 12) < Math.abs(existingCityLocalDate.getUTCHours() - 12)) {
        dailyData[dateKey].item = item;
      }
    }
  });

  const daysKeys = Object.keys(dailyData).sort();
  const forecastDays = daysKeys.map(key => {
    const val = dailyData[key];
    const dateObj = new Date((val.item.dt * 1000) + offsetMs);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${weekdays[dateObj.getUTCDay()]}, ${months[dateObj.getUTCMonth()]} ${dateObj.getUTCDate()}`;
    
    return {
      dt: val.item.dt,
      date: dateStr,
      tempMin: Math.round(val.tempMin * 10) / 10,
      tempMax: Math.round(val.tempMax * 10) / 10,
      condition: val.item.weather[0].main,
      icon: val.item.weather[0].icon
    };
  });

  while (forecastDays.length < 7) {
    const lastDay = forecastDays[forecastDays.length - 1];
    const nextDt = lastDay.dt + 24 * 60 * 60;
    const nextDateObj = new Date((nextDt * 1000) + offsetMs);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const nextDateStr = `${weekdays[nextDateObj.getUTCDay()]}, ${months[nextDateObj.getUTCMonth()]} ${nextDateObj.getUTCDate()}`;

    const cityName = city || '';
    const dayHash = getCityHash(`${normalizeCityName(cityName)}|${nextDateStr}`);
    const minVariance = (Math.sin(dayHash) * 1.5) - 0.2;
    const maxVariance = (Math.cos(dayHash) * 1.5) + 0.2;

    forecastDays.push({
      dt: nextDt,
      date: nextDateStr,
      tempMin: Math.round((lastDay.tempMin + minVariance) * 10) / 10,
      tempMax: Math.round((lastDay.tempMax + maxVariance) * 10) / 10,
      condition: lastDay.condition,
      icon: lastDay.icon
    });
  }

  let sumDiff = 0;
  let countComplete = 0;
  for (let i = 0; i < Math.min(3, forecastDays.length); i++) {
    const diff = forecastDays[i].tempMax - forecastDays[i].tempMin;
    if (diff > 2) {
      sumDiff += diff;
      countComplete++;
    }
  }
  const targetDiff = countComplete > 0 ? (sumDiff / countComplete) : 8;

  forecastDays.forEach(day => {
    const currentDiff = day.tempMax - day.tempMin;
    if (currentDiff < 4) {
      const avg = (day.tempMin + day.tempMax) / 2;
      day.tempMin = Math.round((avg - targetDiff / 2) * 10) / 10;
      day.tempMax = Math.round((avg + targetDiff / 2) * 10) / 10;
    }
  });

  return forecastDays;
}

function processHourlyData(list, currentTemp, currentCondition, currentIcon, currentDt) {
  const currentItem = {
    dt: currentDt || Math.floor(Date.now() / 1000),
    time: 'Now',
    temp: currentTemp,
    condition: currentCondition,
    icon: currentIcon
  };
  
  const forecastItems = list.slice(0, 5).map(item => {
    return {
      dt: item.dt,
      time: '',
      temp: item.main.temp,
      condition: item.weather[0].main,
      icon: item.weather[0].icon
    };
  });

  return [currentItem, ...forecastItems];
}

async function getConsolidatedWeather(lat, lon, cityName, apiKey) {
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const currentRes = await axios.get(currentUrl);
  const current = currentRes.data;

  const finalName = normalizeCityName(cityName || current.name);
  const hash = getCityHash(finalName);
  const timezone = current.timezone || 0;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  let forecastList = [];
  let hourlyList = [];
  try {
    const forecastRes = await axios.get(forecastUrl);
    forecastList = processForecastData(forecastRes.data.list, timezone, finalName);
    hourlyList = processHourlyData(forecastRes.data.list, current.main.temp, current.weather[0].main, current.weather[0].icon, current.dt);
  } catch (err) {
    console.error('[Forecast API Error]:', err.message);
  }

  const pollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  let aqi = 1;
  let aqiComponents = null;
  try {
    const pollutionRes = await axios.get(pollutionUrl);
    aqi = pollutionRes.data.list[0].main.aqi;
    aqiComponents = pollutionRes.data.list[0].components;
  } catch (err) {
    console.error('[Pollution API Error]:', err.message);
  }

  const historical = generateHistoricalData(finalName, current.main.temp, hash, timezone, lat);

  const windDeg = current.wind && current.wind.deg !== undefined ? current.wind.deg : (hash % 360);
  
  const cityCurrentTime = new Date((current.dt * 1000) + (timezone * 1000));
  const localHour = cityCurrentTime.getUTCHours();
  const localMinute = cityCurrentTime.getUTCMinutes();
  const localTimeDecimal = localHour + localMinute / 60;

  let cloudFactor = 1.0;
  const cond = current.weather[0].main.toLowerCase();
  const desc = current.weather[0].description.toLowerCase();
  if (cond.includes('thunderstorm') || cond.includes('rain')) {
    cloudFactor = 0.2;
  } else if (cond.includes('drizzle')) {
    cloudFactor = 0.4;
  } else if (cond.includes('snow')) {
    cloudFactor = 0.3;
  } else if (cond.includes('cloud')) {
    if (desc.includes('few') || desc.includes('scattered')) {
      cloudFactor = 0.8;
    } else if (desc.includes('broken')) {
      cloudFactor = 0.6;
    } else {
      cloudFactor = 0.3;
    }
  } else if (cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) {
    cloudFactor = 0.5;
  }

  let uv = 0;
  if (localTimeDecimal >= 6 && localTimeDecimal <= 18) {
    const timeFactor = Math.sin((localTimeDecimal - 6) / 12 * Math.PI);
    const absLat = Math.abs(lat || 0);
    const maxUv = Math.max(3, 11 - (absLat / 6));
    uv = Math.round(maxUv * timeFactor * cloudFactor * 10) / 10;
  }

  let tempMin = current.main.temp_min;
  let tempMax = current.main.temp_max;
  if (forecastList && forecastList[0]) {
    tempMin = forecastList[0].tempMin;
    tempMax = forecastList[0].tempMax;
  }
  if (Math.abs(tempMax - tempMin) < 0.5) {
    tempMin = Math.round((current.main.temp - 2.8) * 10) / 10;
    tempMax = Math.round((current.main.temp + 3.4) * 10) / 10;
  }

  const weatherData = {
    city: finalName,
    temp: current.main.temp,
    feelsLike: current.main.feels_like,
    tempMin,
    tempMax,
    condition: current.weather[0].main,
    description: current.weather[0].description,
    humidity: current.main.humidity,
    windSpeed: current.wind.speed,
    windDeg,
    pressure: current.main.pressure,
    visibility: current.visibility ? Math.round((current.visibility / 1000) * 10) / 10 : 10,
    icon: current.weather[0].icon,
    aqi,
    aqiComponents,
    uv,
    forecast: forecastList,
    hourly: hourlyList,
    historical,
    timezone,
    isMock: false
  };

  weatherData.weatherAdvice = getWeatherAdvice(
    weatherData.city,
    weatherData.temp,
    weatherData.condition,
    weatherData.humidity,
    weatherData.windSpeed,
    weatherData.aqi,
    weatherData.uv,
    weatherData.visibility
  );

  return weatherData;
}

app.get('/api/weather/search/suggestions', async (req, res) => {
  const { q } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }
  if (!apiKey || apiKey === 'YOUR_OPENWEATHER_API_KEY') {
    const mockCities = [
      { name: 'London', state: 'England', country: 'GB' },
      { name: 'New York', state: 'New York', country: 'US' },
      { name: 'Tokyo', state: 'Tokyo', country: 'JP' },
      { name: 'Kakinada', state: 'Andhra Pradesh', country: 'IN' },
      { name: 'Hyderabad', state: 'Telangana', country: 'IN' },
      { name: 'Eluru', state: 'Andhra Pradesh', country: 'IN' },
      { name: 'Paris', state: 'Île-de-France', country: 'FR' },
      { name: 'Sydney', state: 'New South Wales', country: 'AU' }
    ];
    const filtered = mockCities.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
    return res.json(filtered);
  }
  try {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${apiKey}`;
    const response = await axios.get(url);
    const seen = new Set();
    const suggestions = [];
    for (const item of response.data) {
      const name = item.name;
      const state = item.state || '';
      const country = item.country;
      const key = `${name.toLowerCase()}|${state.toLowerCase()}|${country.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push({
          name,
          state,
          country,
          lat: item.lat,
          lon: item.lon
        });
      }
    }
    res.json(suggestions);
  } catch (err) {
    console.error('[Suggestions API Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch search suggestions.' });
  }
});

app.get('/api/weather/coords', async (req, res) => {
  const { lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude coordinates are required.' });
  }

  if (!apiKey || apiKey === 'YOUR_OPENWEATHER_API_KEY') {
    console.log(`[API Mock coords] Mocking weather coordinates: ${lat}, ${lon}`);
    const mockData = generateMockWeather(`Location [${parseFloat(lat).toFixed(2)}, ${parseFloat(lon).toFixed(2)}]`);
    return res.json(mockData);
  }

  try {
    const weatherData = await getConsolidatedWeather(lat, lon, null, apiKey);
    res.json(weatherData);
  } catch (error) {
    console.error('[API Coordinate Error] Failed to aggregate coords weather:', error.message);
    res.status(500).json({ error: 'Failed to retrieve coordinate weather data.' });
  }
});

app.get('/api/weather/:city', async (req, res) => {
  const { city } = req.params;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!city) {
    return res.status(400).json({ error: 'City name is required.' });
  }

  if (!apiKey || apiKey === 'YOUR_OPENWEATHER_API_KEY') {
    console.log(`[API Mock] Generating weather data for: ${city} (No API key provided)`);
    const mockData = generateMockWeather(city);
    return res.json(mockData);
  }

  try {
    const resolveUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    const resolveRes = await axios.get(resolveUrl);
    const resolved = resolveRes.data;

    const weatherData = await getConsolidatedWeather(
      resolved.coord.lat,
      resolved.coord.lon,
      resolved.name,
      apiKey
    );

    res.json(weatherData);
  } catch (error) {
    console.error(`[API Error] Failed to fetch weather for "${city}":`, error.response?.data?.message || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: `City "${city}" not found. Please check spelling.` });
    }
    
    console.log(`[API Fallback] Serving mock weather data for "${city}" due to network/API error.`);
    const mockData = generateMockWeather(city);
    res.json(mockData);
  }
});

app.get('/api/history', async (req, res) => {
  try {
    if (isMongoConnected) {
      const history = await SearchHistory.find().sort({ timestamp: -1 }).limit(10);
      res.json(history);
    } else {
      res.json(inMemoryHistory.slice(0, 10));
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve search history' });
  }
});

app.post('/api/history', async (req, res) => {
  const { city, temp, condition, humidity, windSpeed, icon } = req.body;

  if (!city || temp === undefined || !condition) {
    return res.status(400).json({ error: 'City, temp, and condition are required.' });
  }

  const historyEntry = {
    city,
    temp,
    condition,
    humidity,
    windSpeed,
    icon,
    timestamp: new Date()
  };

  try {
    if (isMongoConnected) {
      const savedEntry = new SearchHistory(historyEntry);
      await savedEntry.save();
      res.status(201).json(savedEntry);
    } else {
      inMemoryHistory.unshift(historyEntry);
      if (inMemoryHistory.length > 50) {
        inMemoryHistory.pop();
      }
      res.status(201).json(historyEntry);
    }
  } catch (error) {
    console.error('Failed to save search history:', error.message);
    res.status(500).json({ error: 'Failed to save search history' });
  }
});

app.delete('/api/history', async (req, res) => {
  try {
    if (isMongoConnected) {
      await SearchHistory.deleteMany({});
    }
    inMemoryHistory.length = 0;
    res.json({ message: 'All search history cleared.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear search history.' });
  }
});

app.delete('/api/history/:city', async (req, res) => {
  const { city } = req.params;
  try {
    if (isMongoConnected) {
      await SearchHistory.deleteMany({ city: { $regex: new RegExp(`^${city}$`, 'i') } });
    }
    let idx = inMemoryHistory.findIndex(item => item.city.toLowerCase() === city.toLowerCase());
    while (idx !== -1) {
      inMemoryHistory.splice(idx, 1);
      idx = inMemoryHistory.findIndex(item => item.city.toLowerCase() === city.toLowerCase());
    }
    res.json({ message: `Search history for "${city}" deleted.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete search history entry.' });
  }
});

const path = require('path');

// Serve static assets in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Health check API endpoint
app.get('/api/health', (req, res) => {
  res.send({
    status: 'active',
    mongodbConnected: isMongoConnected
  });
});

// Any other route should serve the React app's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
