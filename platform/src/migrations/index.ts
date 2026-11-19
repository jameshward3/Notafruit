import * as migration_20261117_213123_initial from './20261117_213123_initial';
import * as migration_20261117_224506_style_guide_conformance from './20261117_224506_style_guide_conformance';
import * as migration_20261117_235635_officials_directory from './20261117_235635_officials_directory';
import * as migration_20261117_235915_record_documents from './20261117_235915_record_documents';
import * as migration_20261118_122432_haitian_creole_locale from './20261118_122432_haitian_creole_locale';
import * as migration_20261118_124822_legislation_fiscal from './20261118_124822_legislation_fiscal';
import * as migration_20261118_191817_media_object_key from './20261118_191817_media_object_key';
import * as migration_20261118_193345_city_pages_bids_directory from './20261118_193345_city_pages_bids_directory';
import * as migration_20261119_081047_budget_line_section from './20261119_081047_budget_line_section';

export const migrations = [
  {
    up: migration_20261117_213123_initial.up,
    down: migration_20261117_213123_initial.down,
    name: '20261117_213123_initial',
  },
  {
    up: migration_20261117_224506_style_guide_conformance.up,
    down: migration_20261117_224506_style_guide_conformance.down,
    name: '20261117_224506_style_guide_conformance',
  },
  {
    up: migration_20261117_235635_officials_directory.up,
    down: migration_20261117_235635_officials_directory.down,
    name: '20261117_235635_officials_directory',
  },
  {
    up: migration_20261117_235915_record_documents.up,
    down: migration_20261117_235915_record_documents.down,
    name: '20261117_235915_record_documents',
  },
  {
    up: migration_20261118_122432_haitian_creole_locale.up,
    down: migration_20261118_122432_haitian_creole_locale.down,
    name: '20261118_122432_haitian_creole_locale',
  },
  {
    up: migration_20261118_124822_legislation_fiscal.up,
    down: migration_20261118_124822_legislation_fiscal.down,
    name: '20261118_124822_legislation_fiscal',
  },
  {
    up: migration_20261118_191817_media_object_key.up,
    down: migration_20261118_191817_media_object_key.down,
    name: '20261118_191817_media_object_key',
  },
  {
    up: migration_20261118_193345_city_pages_bids_directory.up,
    down: migration_20261118_193345_city_pages_bids_directory.down,
    name: '20261118_193345_city_pages_bids_directory',
  },
  {
    up: migration_20261119_081047_budget_line_section.up,
    down: migration_20261119_081047_budget_line_section.down,
    name: '20261119_081047_budget_line_section'
  },
];
