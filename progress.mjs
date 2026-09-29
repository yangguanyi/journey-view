// Client-safe map types and calendar calculations. No trip geography or booking data.
function localDate(date, timezone) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const part = (name) => parts.find(value => value.type === name)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
}
/** Itinerary-based calendar progress. It never reads GPS and is not a verified arrival report. */
export function getTripProgress(date, route) {
    const empty = { phase: 'before', currentStopId: null, currentStopIndex: -1, completedStopIds: [], upcomingStopIds: route.map(stop => stop.id), fraction: 0, dateLabel: Number.isFinite(date.getTime()) ? localDate(date, 'UTC') : '' };
    if (!route.length || !Number.isFinite(date.getTime()))
        return empty;
    const first = route[0];
    const last = route[route.length - 1];
    if (localDate(date, first.timezone) < first.arrival)
        return { ...empty, dateLabel: localDate(date, first.timezone) };
    if (localDate(date, last.timezone) > last.departure)
        return { phase: 'after', currentStopId: last.id, currentStopIndex: route.length - 1, completedStopIds: route.map(stop => stop.id), upcomingStopIds: [], fraction: 1, dateLabel: localDate(date, last.timezone) };
    // On travel days, the later destination is the day's planned location.
    let currentStopIndex = 0;
    route.forEach((stop, index) => { if (localDate(date, stop.timezone) >= stop.arrival)
        currentStopIndex = index; });
    const current = route[currentStopIndex];
    const dateLabel = localDate(date, current.timezone);
    const duration = Date.parse(`${last.departure}T00:00:00Z`) - Date.parse(`${first.arrival}T00:00:00Z`);
    const elapsed = Date.parse(`${dateLabel}T00:00:00Z`) - Date.parse(`${first.arrival}T00:00:00Z`);
    return { phase: 'during', currentStopId: current.id, currentStopIndex, completedStopIds: route.slice(0, currentStopIndex).map(stop => stop.id), upcomingStopIds: route.slice(currentStopIndex + 1).map(stop => stop.id), fraction: duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0, dateLabel };
}
