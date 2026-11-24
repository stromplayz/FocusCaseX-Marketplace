---
fcxui: dashboard
---

# Daily huddle

The ten-minute morning meeting, live: the board carries the day's book (advance, reschedule, settle), the funnel shows the queue, recalls name who to call, and the cash desk previews collections. Everything reads and writes the book at `Clinic/Appointment.md`.

```ui-capsule
capsule: ui-appointment
```

```ui-flow
```

```ui-recalls
```

```ui-billing
```

```ui-actions
items:
  - Book appointment|focuslinks-navigation:open-appointments
  - Walk-in patient|focuslinks-navigation:new-appointment
  - Today's collections|focuslinks-navigation:open-dashboard
  - Open billing desk|focuslinks-navigation:open-billing
```

```ui-panel
title: Huddle pulse
- pulse
```
