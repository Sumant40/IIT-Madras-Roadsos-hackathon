export default function EmergencyOverlay({ countryInfo, onCallAmbulance }) {
  if (!countryInfo) return null

  const { country_code, country_name, numbers } = countryInfo

  return (
    <div className="emergency-overlay" aria-label={`Emergency numbers for ${country_name}`}>
      <span className="emergency-overlay-country">{country_code} · {country_name}</span>
      <div className="emergency-overlay-numbers">
        <a href={`tel:${numbers.ambulance}`} onClick={onCallAmbulance}>
          Ambulance {numbers.ambulance}
        </a>
        {numbers.police !== numbers.ambulance && (
          <a href={`tel:${numbers.police}`}>Police {numbers.police}</a>
        )}
        {numbers.fire && numbers.fire !== numbers.police && (
          <a href={`tel:${numbers.fire}`}>Fire {numbers.fire}</a>
        )}
      </div>
    </div>
  )
}
