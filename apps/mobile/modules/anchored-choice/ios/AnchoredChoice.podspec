Pod::Spec.new do |s|
  s.name = 'AnchoredChoice'
  s.version = '1.0.0'
  s.summary = 'Anchored system choice menu for Overtaek'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'Overtaek'
  s.homepage = 'https://overtaek.xyz'
  s.platforms = { :ios => '16.0' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
