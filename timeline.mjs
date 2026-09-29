const shortDate = (s) => new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const cityNames = (s) => s.split(/→|↔|\//).map(c => c.trim().replace(/\s+(Pudong|Hongqiao|Tianfu|Incheon)$/i, '').toLowerCase()).filter(Boolean);
const sameCity = (a, b) => cityNames(a).some(c => cityNames(b).includes(c));
const ends = (e) => { const cities = e.city.split(/→|↔/).map(c => c.trim()); return { from: cities[0], to: cities[cities.length - 1] }; };
const minutes = (s) => { const m = s.match(/^(\d{1,2}):(\d{2})(?:\s|$)/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const partOfDay = (s) => /early[ -]morning/i.test(s) ? 420 : /morning/i.test(s) ? 540 : /late afternoon/i.test(s) ? 990 : /afternoon/i.test(s) ? 900 : /evening|sunset/i.test(s) ? 1140 : null;
const optional = (e) => /\boptional\b|\bbackup\b/i.test(e.title) && !['booked', 'confirmed', 'done'].includes(e.status);
const cruise = (e) => e.type === 'reservation' && e.start < e.end && /cruise|cabin|boarding|suite.*deck/i.test(e.title + ' ' + e.details);
const base = (e, label, order = 0) => ({ entry: e, label, title: e.title, timeLabel: '', note: '', order });
const timed = (e) => [e.time, e.endTime].filter(Boolean).join(' – ');
const byOrder = (a, b) => a.order - b.order || a.title.localeCompare(b.title);
/** Presentation only: never changes bookings or supplies missing appointment times. */
export function buildDayTimeline(entries, day) {
    const result = { overview: [], schedule: [], flexible: [], stays: [], alternatives: [] };
    const active = entries.filter(e => e.start <= day && e.end >= day && e.type !== 'task');
    const flights = entries.filter(e => e.type === 'flight' && !optional(e));
    const departures = flights.filter(e => e.start === day), arrivals = flights.filter(e => e.end === day);
    const transports = active.filter(e => e.type === 'transport' && !optional(e));
    const cruiseToday = active.find(cruise);
    const arrivalFor = (hotel) => flights.find(f => f.start === hotel.start && f.end > hotel.start && f.end < hotel.end && sameCity(ends(f).to, hotel.city));
    const transportItems = new Map();
    for (const e of transports) {
        const item = base(e, 'Transport');
        item.timeLabel = timed(e);
        const incoming = arrivals.find(f => sameCity(ends(f).to, e.city));
        const outgoing = departures.find(f => sameCity(ends(f).from, e.city));
        const clock = minutes(e.time), approx = partOfDay(e.time);
        if (incoming && !outgoing) {
            // An airport transfer follows the arrival, even if its own clock time is blank.
            item.order = (incoming.start === day ? Math.max(minutes(incoming.time) || 0, minutes(incoming.endTime) || 0) : minutes(incoming.endTime) || 0) + 1;
            item.timeLabel = item.timeLabel || 'After flight arrival · pickup time to arrange';
        }
        else if (outgoing && !incoming) {
            item.order = clock ?? approx ?? (minutes(outgoing.time) || 720) - 1;
            item.timeLabel = item.timeLabel || 'Before the flight · departure time to arrange';
        }
        else if (/embarkation|boarding/i.test(e.title)) {
            item.order = clock ?? ((cruiseToday ? minutes(cruiseToday.time) : null) ?? 900) - 1;
            item.timeLabel = item.timeLabel || 'Before boarding · time to arrange';
        }
        else if (/cruise ending|disembark/i.test(e.title)) {
            item.order = clock ?? ((cruiseToday ? minutes(cruiseToday.endTime) : null) ?? 780) + 1;
            item.timeLabel = item.timeLabel || 'After disembarkation · time to arrange';
        }
        else {
            item.order = clock ?? approx ?? 780;
            item.timeLabel = item.timeLabel || 'Time to arrange';
        }
        if (e.time && /target airport arrival|target.*airport arrival/i.test(e.details))
            item.timeLabel = `${e.time} · target arrival at airport`;
        transportItems.set(e.id, item);
    }
    for (const e of active) {
        if (e.type === 'activity' && e.id.startsWith('day-')) {
            result.overview.push(e);
            continue;
        }
        if (optional(e)) {
            const item = base(e, 'Optional / backup');
            item.timeLabel = timed(e);
            result.alternatives.push(item);
            continue;
        }
        if (e.type === 'hotel') {
            const delayed = arrivalFor(e), actualStart = delayed?.end || e.start;
            if (day === e.end) {
                const item = base(e, 'Check out', -1);
                item.timeLabel = e.endTime || 'Checkout time to confirm';
                result.schedule.push(item);
            }
            else if (day === actualStart) {
                const incoming = arrivals.find(f => sameCity(ends(f).to, e.city));
                const transfer = transports.filter(t => !/[↔]/.test(t.title + t.city) && sameCity(ends(t).to, e.city) && (!departures.some(f => sameCity(ends(f).from, t.city)) || !!incoming)).map(t => transportItems.get(t.id)).sort(byOrder).at(-1);
                const item = base(e, 'Check in', transfer ? transfer.order + 1 : incoming ? (minutes(incoming.endTime) || 0) + 2 : 900);
                item.timeLabel = delayed ? 'After the airport transfer' : incoming ? 'After arrival and transfer' : transfer ? 'After the journey' : 'Check-in time to confirm';
                item.note = delayed ? `Room reserved from ${shortDate(e.start)} for arrival after midnight on ${shortDate(actualStart)}. Confirm the hotel will hold the room.` : '';
                if (e.time)
                    item.note += (item.note ? ' ' : '') + `Hotel policy: ${e.time}.`;
                result.schedule.push(item);
            }
            else {
                const item = base(e, day < actualStart ? 'Room reserved for arrival after midnight' : 'Staying tonight');
                if (day < actualStart)
                    item.note = `Reservation starts ${shortDate(e.start)}; arrival and check-in follow the flight on ${shortDate(actualStart)}. Confirm the room is held for late arrival.`;
                result.stays.push(item);
            }
            continue;
        }
        if (e.type === 'flight') {
            const route = ends(e), code = e.title.split(' · ')[0];
            if (day === e.start) {
                const item = base(e, 'Flight departure', minutes(e.time) ?? 720);
                item.timeLabel = `${e.time || 'Time to add'} departure${e.endTime ? ' → ' + e.endTime + ' arrival' : ''}${e.end > e.start ? ' on ' + shortDate(e.end) : ' · local times'}`;
                if (e.end === e.start && minutes(e.endTime) !== null && minutes(e.time) !== null && minutes(e.endTime) < minutes(e.time))
                    item.note = 'Arrival is on the same calendar date in the destination’s local time zone.';
                result.schedule.push(item);
            }
            else if (day === e.end) {
                const item = base(e, 'Flight arrival', minutes(e.endTime) ?? 720);
                item.title = `Arrive in ${route.to} · ${code}`;
                item.timeLabel = `${e.endTime || 'Time to add'} · arrival (local time)`;
                item.note = `Continuation of the flight from ${route.from}, which departed ${shortDate(e.start)}${e.time ? ' at ' + e.time : ''}.`;
                item.arrivalOnly = true;
                result.schedule.push(item);
            }
            else
                result.stays.push({ ...base(e, 'In flight'), note: `Arrives ${shortDate(e.end)}${e.endTime ? ' at ' + e.endTime : ''} local time.` });
            continue;
        }
        if (e.type === 'transport') {
            result.schedule.push(transportItems.get(e.id));
            continue;
        }
        if (cruise(e)) {
            const label = day === e.start ? 'Board cruise' : day === e.end ? 'Disembark' : 'Aboard the cruise';
            const item = base(e, label, day === e.start ? (minutes(e.time) ?? 900) : (minutes(e.endTime) ?? 780));
            item.timeLabel = day === e.start ? (e.time || 'Boarding time to confirm') : day === e.end ? (e.endTime || 'Disembarkation time to confirm') : '';
            if (day !== e.start && day !== e.end)
                result.stays.push(item);
            else
                result.schedule.push(item);
            continue;
        }
        const clock = minutes(e.time), part = partOfDay(e.time || e.details.split('. ')[0]);
        const fullDay = /full day/i.test(e.time);
        const item = base(e, e.type === 'activity' ? 'Plan' : 'Reservation', clock ?? part ?? (fullDay ? 420 : 0));
        item.timeLabel = timed(e);
        if (!item.timeLabel && part !== null)
            item.timeLabel = (part === 420 ? 'Early morning' : part === 540 ? 'Morning' : part === 990 ? 'Late afternoon' : part === 900 ? 'Afternoon' : 'Evening') + ' in the plan · exact time to arrange';
        const connection = transports.find(t => sameCity(ends(t).to, e.city) && !sameCity(ends(t).from, e.city));
        if (clock !== null || part !== null || fullDay) {
            result.schedule.push(item);
        }
        else if (connection) {
            item.order = transportItems.get(connection.id).order + 1;
            item.timeLabel = 'After the journey · time to arrange';
            result.schedule.push(item);
        }
        else
            result.flexible.push(item);
    }
    result.schedule.sort(byOrder);
    return result;
}
