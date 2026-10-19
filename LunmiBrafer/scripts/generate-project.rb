#!/usr/bin/env ruby
require 'xcodeproj'
root = File.expand_path('..', __dir__)
project_path = File.join(root, 'LunmiBrafer.xcodeproj')
abort 'Project already exists; edit it in Xcode instead of regenerating.' if File.exist?(project_path)
project = Xcodeproj::Project.new(project_path)
project.root_object.attributes['LastUpgradeCheck'] = '2660'
project.root_object.attributes['BuildIndependentTargetsInParallel'] = 'YES'
project.root_object.development_region = 'en'
project.root_object.known_regions = ['en', 'ja', 'Base']
app = project.new_target(:application, 'LunmiBrafer', :ios, '15.6')
source = project.main_group.new_group('LunmiBrafer', 'LunmiBrafer')
Dir.glob(File.join(root, 'LunmiBrafer', '*.swift')).sort.each { |filename| app.source_build_phase.add_file_reference(source.new_file(File.basename(filename))) }
['Info.plist', 'Web', 'WebBundleManifest.json'].each do |filename|
  ref = source.new_file(filename)
  ref.last_known_file_type = 'folder' if filename == 'Web'
end
['Configuration.plist', 'LaunchScreen.storyboard', 'Assets.xcassets'].each do |filename|
  ref = source.new_file(filename)
  ref.last_known_file_type = 'folder.assetcatalog' if filename == 'Assets.xcassets'
  app.resources_build_phase.add_file_reference(ref)
end
['InfoPlist.strings', 'Localizable.strings'].each do |filename|
  variant = source.new_variant_group(filename)
  ['en', 'ja'].each do |locale|
    ref = variant.new_file("#{locale}.lproj/#{filename}")
    ref.name = locale
  end
  app.resources_build_phase.add_file_reference(variant)
end
sync = app.new_shell_script_build_phase('Synchronize H5 source')
sync.shell_script = '/bin/sh "$SRCROOT/scripts/sync-h5.sh"'
sync.always_out_of_date = '1'
sync.output_paths = ['$(DERIVED_FILE_DIR)/LunmiBrafer-Info.plist']
app.build_phases.delete(sync)
app.build_phases.insert(0, sync)
embed = app.new_shell_script_build_phase('Embed current H5 bundle')
embed.shell_script = '/bin/sh "$SRCROOT/scripts/embed-h5.sh"'
embed.always_out_of_date = '1'
app.build_configurations.each do |config|
  config.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER'=>'com.lunmi.LunmiBrafer',
    'PRODUCT_NAME'=>'$(TARGET_NAME)', 'INFOPLIST_FILE'=>'$(DERIVED_FILE_DIR)/LunmiBrafer-Info.plist',
    'CODE_SIGN_STYLE'=>'Automatic',
    'ASSETCATALOG_COMPILER_APPICON_NAME'=>'AppIcon', 'MARKETING_VERSION'=>'1.0.0', 'CURRENT_PROJECT_VERSION'=>'1', 'SWIFT_VERSION'=>'5.0',
    'TARGETED_DEVICE_FAMILY'=>'1', 'ENABLE_USER_SCRIPT_SANDBOXING'=>'NO',
    'GENERATE_INFOPLIST_FILE'=>'NO', 'SWIFT_EMIT_LOC_STRINGS'=>'YES',
    'LD_RUNPATH_SEARCH_PATHS'=>['$(inherited)', '@executable_path/Frameworks']
  })
end
project.root_object.attributes['TargetAttributes'] = { app.uuid => { 'SystemCapabilities' => { 'com.apple.InAppPurchase' => { 'enabled' => 1 } } } }
project.build_configurations.each do |config|
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.6'
  config.build_settings['ENABLE_TESTABILITY'] = 'NO'
  config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
end
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.set_launch_target(app)
scheme.test_action.build_configuration = 'Release'
scheme.test_action.xml_element.attributes['shouldAutocreateTestPlan'] = 'NO'
scheme.doc.elements.each('Scheme/BuildAction/BuildActionEntries/BuildActionEntry') { |entry| entry.attributes['buildForTesting'] = 'NO' }
['LaunchAction', 'ProfileAction', 'AnalyzeAction', 'ArchiveAction'].each { |action| scheme.doc.root.elements[action].attributes['buildConfiguration'] = 'Release' }
scheme.doc.root.elements['LaunchAction'].attributes['allowLocationSimulation'] = 'NO'
project.build_configuration_list.default_configuration_name = 'Release'
app.build_configuration_list.default_configuration_name = 'Release'
scheme.save_as(project.path, 'LunmiBrafer', true)
project.save
puts "Created #{project.path}"
