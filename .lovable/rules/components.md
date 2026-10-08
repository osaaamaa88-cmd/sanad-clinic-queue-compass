# Components

Component catalog for **Remix of سندي**. Import all components from `@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b`.

### AccountDeletion

```ts
import { AccountDeletion } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### AlarmStopper

```ts
import { AlarmStopper } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### AppShell

```ts
import { AppShell } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### AvatarActionSheet

```ts
import { AvatarActionSheet } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### BroadcastBanner

```ts
import { BroadcastBanner } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### Button

```ts
import { Button } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

**Props:**

| Prop | Type | Default |
|---|---|---|
| `variant` | default · destructive · outline · secondary · ghost · link | `default` |
| `size` | default · sm · lg · icon | `default` |
| `asChild` | boolean | `false` |

### ClinicQrCard

```ts
import { ClinicQrCard } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### ClinicsMap

```ts
import { ClinicsMap } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

Use for the unified clinic and governmental-hospital directory. Numbered clusters separate on zoom; onSelect supplies the selected facility for a nonmodal preview.

**Props:**

| Prop | Type | Default |
|---|---|---|
| `clinics` | any | `—` |
| `center` | object | `—` |
| `selectedId` | string | `—` |
| `onSelect` | function | `—` |
| `size` | default · compact | `default` |

**Examples:**

_Patient directory map_
```tsx
<ClinicsMap clinics={facilities} center={patientLocation} selectedId={selected?.id} onSelect={setSelected} />
```

**Avoid:**

- Do not invent clinic or hospital coordinates.
- Do not evaluate Leaflet or markercluster before hydration.
- Do not obscure preview actions with bottom navigation.

### Constants

```ts
import { Constants } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### DbHealthTab

```ts
import { DbHealthTab } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### DeletionRequestsTab

```ts
import { DeletionRequestsTab } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### DoctorBottomNav

```ts
import { DoctorBottomNav } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### DoctorNameSearch

```ts
import { DoctorNameSearch } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### FloatingVoiceAssistant

```ts
import { FloatingVoiceAssistant } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### HospitalLocationsTab

```ts
import { HospitalLocationsTab } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### IdleLogout

```ts
import { IdleLogout } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### LiveBookingsTab

```ts
import { LiveBookingsTab } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### LocationPickerModal

```ts
import { LocationPickerModal } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### MediaTab

```ts
import { MediaTab } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### MedicalDisclaimer

```ts
import { MedicalDisclaimer } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### NetworkStatus

```ts
import { NetworkStatus } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### NotificationsBell

```ts
import { NotificationsBell } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### PatientAuthForm

```ts
import { PatientAuthForm } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### PatientAuthModal

```ts
import { PatientAuthModal } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

**Props:**

| Prop | Type | Default |
|---|---|---|
| `onDone` | function | `—` |
| `onClose` | function | `—` |
| `title` | string | `—` |

### PatientBottomNav

```ts
import { PatientBottomNav } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### PostViewer

```ts
import { PostViewer } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### RxComposer

```ts
import { RxComposer } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### SecurityTab

```ts
import { SecurityTab } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### SoundToggle

```ts
import { SoundToggle } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### StaffAuth

```ts
import { StaffAuth } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### StoryViewer

```ts
import { StoryViewer } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### SystemTab

```ts
import { SystemTab } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### ThemeSetting

```ts
import { ThemeSetting } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### ThemeToggle

```ts
import { ThemeToggle } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

### UsersTab

```ts
import { UsersTab } from "@ws-workspace-01m4az80adfmjbhep280ecs3xg/9d64e5f5-7044-4a10-b6ff-3d244f11834b"
```

