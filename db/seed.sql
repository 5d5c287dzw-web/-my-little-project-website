INSERT OR IGNORE INTO projects(id,slug,title,category,status,description) VALUES
('LP-031','little-rc-buggy','Little RC Buggy','Robotics & RC','prototype','Build a miniature remote-controlled buggy.'),
('LP-001','little-flight-radar','Little Flight Radar','Electronics & Coding','prototype','Build a compact aircraft tracking display.');
INSERT OR IGNORE INTO project_revisions(id,project_id,revision,notes) VALUES
('LP-031-R0','LP-031','concept','Unverified prototype: not a released hardware revision'),
('LP-001-R0','LP-001','concept','Unverified prototype: not a released hardware revision');
INSERT OR IGNORE INTO parts(id,sku,name,kind,status,description) VALUES
('PART-001','LP031-BRACKET','Buggy wheel bracket','replacement','concept','Proposed printable wheel bracket. No validated print file.'),
('PART-002','LP031-SHELL','Buggy body shell','upgrade','concept','Proposed custom body shell.'),
('PART-003','LP001-CASE','Flight Radar enclosure','enclosure','concept','Proposed display enclosure.'),
('PART-004','LP031-SENSOR','Buggy sensor mount','upgrade','concept','Proposed sensor mount.');
INSERT OR IGNORE INTO part_compatibility(part_id,revision_id) VALUES
('PART-001','LP-031-R0'),('PART-002','LP-031-R0'),('PART-003','LP-001-R0'),('PART-004','LP-031-R0');
