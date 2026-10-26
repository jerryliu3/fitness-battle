require 'xcodeproj'
require 'fileutils'
output = File.expand_path(ARGV.fetch(0))
FileUtils.mkdir_p(output)
FileUtils.cp(File.join(__dir__, 'FieldGestures.swift'), File.join(output, 'FieldGestures.swift'))
p = Xcodeproj::Project.new(File.join(output, 'FieldGestures.xcodeproj'))
t = p.new_target(:ui_test_bundle, 'FieldGestures', :ios, '16.0')
f = p.main_group.new_file('FieldGestures.swift'); t.source_build_phase.add_file_reference(f)
t.build_configurations.each do |c|
 c.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.overtaek.field-gestures'
 c.build_settings['SWIFT_VERSION'] = '5.0'
 c.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
 c.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
 c.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
end
p.save
s = Xcodeproj::XCScheme.new
s.add_build_target(t); s.add_test_target(t); s.save_as(p.path, 'FieldGestures', true)
