---
fcxui: dashboard
---

# Appointment book

A complete front-desk day book: the board below writes straight into the markdown table underneath it — advance bookings through booked → arrived → in-exam → counselling → optics → billing → done, settle cash, card or UPI at the desk, and slot walk-ins into the current time. Create one page per counter, or add a `book: <path>` line inside the board's fence to point it at the clinic's main book instead.

| Time | Date | Patient | MR | Phone | Visit type | With | Reason | Status | Age | Sex | Fee |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

```ui-appointment
```

```ui-panel
title: Front desk
- booking
- pipeline
```
