import * as migration_20250929_111647 from './20250929_111647'
import * as migration_20260614_073700_directory_core from './20260614_073700_directory_core'
import * as migration_20260614_075000_directory_payload_admin from './20260614_075000_directory_payload_admin'

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20260614_073700_directory_core.up,
    down: migration_20260614_073700_directory_core.down,
    name: '20260614_073700_directory_core',
  },
  {
    up: migration_20260614_075000_directory_payload_admin.up,
    down: migration_20260614_075000_directory_payload_admin.down,
    name: '20260614_075000_directory_payload_admin',
  },
]
