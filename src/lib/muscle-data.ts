// Muscle groups and their positions on a 2D body map (front/back views)
// Coordinates are normalized 0-100 on a 200x400 canvas (front at x:0-100, back at x:100-200)

export interface MuscleGroup {
  id: string;
  name: string;
  view: "front" | "back" | "both";
  // Polygon points for the muscle region (normalized 0-100)
  points: [number, number][];
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  // Front view
  { id: "chest", name: "Chest (Pectorals)", view: "front", points: [[35,18],[65,18],[70,32],[30,32]] },
  { id: "front_delts", name: "Front Deltoids", view: "front", points: [[25,17],[35,17],[32,28],[22,28]] },
  { id: "front_delts_r", name: "Front Deltoids", view: "front", points: [[65,17],[75,17],[78,28],[68,28]] },
  { id: "biceps", name: "Biceps", view: "front", points: [[28,30],[35,30],[36,50],[26,50]] },
  { id: "biceps_r", name: "Biceps", view: "front", points: [[65,30],[72,30],[74,50],[64,50]] },
  { id: "abs", name: "Abdominals", view: "front", points: [[38,34],[62,34],[60,55],[40,55]] },
  { id: "obliques", name: "Obliques", view: "front", points: [[30,34],[38,34],[40,50],[28,50]] },
  { id: "obliques_r", name: "Obliques", view: "front", points: [[62,34],[70,34],[72,50],[60,50]] },
  { id: "quads", name: "Quadriceps", view: "front", points: [[34,55],[46,55],[46,82],[32,82]] },
  { id: "quads_r", name: "Quadriceps", view: "front", points: [[54,55],[66,55],[68,82],[54,82]] },
  { id: "calves", name: "Calves", view: "front", points: [[36,84],[46,84],[46,96],[34,96]] },
  { id: "calves_r", name: "Calves", view: "front", points: [[54,84],[64,84],[66,96],[54,96]] },
  { id: "forearms", name: "Forearms", view: "front", points: [[26,52],[35,52],[36,68],[24,68]] },
  { id: "forearms_r", name: "Forearms", view: "front", points: [[65,52],[74,52],[76,68],[64,68]] },

  // Back view
  { id: "traps", name: "Trapezius", view: "back", points: [[130,14],[170,14],[175,24],[125,24]] },
  { id: "rear_delts", name: "Rear Deltoids", view: "back", points: [[122,24],[130,24],[128,32],[120,32]] },
  { id: "rear_delts_r", name: "Rear Deltoids", view: "back", points: [[170,24],[178,24],[180,32],[172,32]] },
  { id: "lats", name: "Latissimus Dorsi", view: "back", points: [[125,26],[135,26],[138,48],[122,48]] },
  { id: "lats_r", name: "Latissimus Dorsi", view: "back", points: [[165,26],[175,26],[178,48],[162,48]] },
  { id: "mid_back", name: "Middle Back (Rhomboids)", view: "back", points: [[138,26],[162,26],[160,42],[140,42]] },
  { id: "lower_back", name: "Lower Back (Erector Spinae)", view: "back", points: [[140,44],[160,44],[158,58],[142,58]] },
  { id: "glutes", name: "Glutes", view: "back", points: [[135,58],[165,58],[168,68],[132,68]] },
  { id: "hamstrings", name: "Hamstrings", view: "back", points: [[134,70],[148,70],[146,85],[132,85]] },
  { id: "hamstrings_r", name: "Hamstrings", view: "back", points: [[152,70],[166,70],[168,85],[154,85]] },
  { id: "calves_back", name: "Calves", view: "back", points: [[136,86],[148,86],[146,96],[134,96]] },
  { id: "calves_back_r", name: "Calves", view: "back", points: [[152,86],[164,86],[166,96],[154,96]] },
  { id: "triceps", name: "Triceps", view: "back", points: [[124,30],[132,30],[134,52],[122,52]] },
  { id: "triceps_r", name: "Triceps", view: "back", points: [[168,30],[176,30],[178,52],[166,52]] },
];

// Exercise to muscle mapping
export interface ExerciseMuscleMap {
  primary: string[];  // muscle group IDs
  secondary: string[];
}

// Pre-built exercise database with muscle mappings
export const EXERCISE_DATABASE: Record<string, { name: string; primary: string[]; secondary: string[]; category: string }> = {
  "bench_press": { name: "Bench Press", primary: ["chest"], secondary: ["front_delts", "triceps"], category: "strength" },
  "push_ups": { name: "Push Ups", primary: ["chest"], secondary: ["front_delts", "triceps", "abs"], category: "strength" },
  "dumbbell_fly": { name: "Dumbbell Fly", primary: ["chest"], secondary: ["front_delts"], category: "strength" },
  "incline_bench": { name: "Incline Bench Press", primary: ["chest"], secondary: ["front_delts", "triceps"], category: "strength" },
  "shoulder_press": { name: "Shoulder Press", primary: ["front_delts"], secondary: ["triceps", "traps"], category: "strength" },
  "lateral_raise": { name: "Lateral Raise", primary: ["front_delts"], secondary: ["traps"], category: "strength" },
  "front_raise": { name: "Front Raise", primary: ["front_delts"], secondary: ["chest"], category: "strength" },
  "barbell_curl": { name: "Barbell Curl", primary: ["biceps"], secondary: ["forearms"], category: "strength" },
  "dumbbell_curl": { name: "Dumbbell Curl", primary: ["biceps"], secondary: ["forearms"], category: "strength" },
  "hammer_curl": { name: "Hammer Curl", primary: ["biceps"], secondary: ["forearms"], category: "strength" },
  "tricep_pushdown": { name: "Tricep Pushdown", primary: ["triceps"], secondary: ["forearms"], category: "strength" },
  "tricep_dip": { name: "Tricep Dip", primary: ["triceps"], secondary: ["chest", "front_delts"], category: "strength" },
  "skull_crusher": { name: "Skull Crusher", primary: ["triceps"], secondary: ["forearms"], category: "strength" },
  "squat": { name: "Squat", primary: ["quads", "glutes"], secondary: ["hamstrings", "lower_back", "abs"], category: "strength" },
  "deadlift": { name: "Deadlift", primary: ["lower_back", "glutes", "hamstrings"], secondary: ["traps", "forearms", "quads"], category: "strength" },
  "leg_press": { name: "Leg Press", primary: ["quads", "glutes"], secondary: ["hamstrings"], category: "strength" },
  "leg_extension": { name: "Leg Extension", primary: ["quads"], secondary: [], category: "strength" },
  "leg_curl": { name: "Leg Curl", primary: ["hamstrings"], secondary: ["glutes"], category: "strength" },
  "calf_raise": { name: "Calf Raise", primary: ["calves"], secondary: [], category: "strength" },
  "pull_up": { name: "Pull Up", primary: ["lats", "biceps"], secondary: ["rear_delts", "mid_back", "forearms"], category: "strength" },
  "lat_pulldown": { name: "Lat Pulldown", primary: ["lats"], secondary: ["biceps", "rear_delts"], category: "strength" },
  "barbell_row": { name: "Barbell Row", primary: ["mid_back", "lats"], secondary: ["biceps", "rear_delts", "lower_back"], category: "strength" },
  "seated_row": { name: "Seated Row", primary: ["mid_back", "lats"], secondary: ["biceps", "rear_delts"], category: "strength" },
  "face_pull": { name: "Face Pull", primary: ["rear_delts", "traps"], secondary: ["mid_back"], category: "strength" },
  "shrug": { name: "Shrug", primary: ["traps"], secondary: ["forearms"], category: "strength" },
  "plank": { name: "Plank", primary: ["abs"], secondary: ["obliques", "lower_back"], category: "core" },
  "crunch": { name: "Crunch", primary: ["abs"], secondary: [], category: "core" },
  "russian_twist": { name: "Russian Twist", primary: ["obliques", "abs"], secondary: [], category: "core" },
  "leg_raise": { name: "Leg Raise", primary: ["abs"], secondary: ["quads"], category: "core" },
  "mountain_climber": { name: "Mountain Climber", primary: ["abs"], secondary: ["quads", "front_delts"], category: "cardio" },
  "burpee": { name: "Burpee", primary: ["quads", "chest"], secondary: ["abs", "front_delts", "calves"], category: "cardio" },
  "jumping_jack": { name: "Jumping Jack", primary: ["calves", "quads"], secondary: ["front_delts"], category: "cardio" },
  "running": { name: "Running/Treadmill", primary: ["quads", "calves", "hamstrings"], secondary: ["glutes", "abs"], category: "cardio" },
  "cycling": { name: "Cycling", primary: ["quads", "hamstrings"], secondary: ["calves", "glutes"], category: "cardio" },
  "rowing": { name: "Rowing Machine", primary: ["lats", "mid_back", "quads"], secondary: ["biceps", "hamstrings", "abs"], category: "cardio" },
  "jump_rope": { name: "Jump Rope", primary: ["calves", "quads"], secondary: ["front_delts", "abs"], category: "cardio" },
  "lunges": { name: "Lunges", primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"], category: "strength" },
  "hip_thrust": { name: "Hip Thrust", primary: ["glutes"], secondary: ["hamstrings", "lower_back"], category: "strength" },
  "romanian_deadlift": { name: "Romanian Deadlift", primary: ["hamstrings", "glutes"], secondary: ["lower_back"], category: "strength" },
  "bulgarian_split_squat": { name: "Bulgarian Split Squat", primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"], category: "strength" },
  // Warmup / stretching
  "arm_circles": { name: "Arm Circles", primary: ["front_delts", "rear_delts"], secondary: ["traps"], category: "warmup" },
  "leg_swings": { name: "Leg Swings", primary: ["hamstrings", "quads"], secondary: ["glutes"], category: "warmup" },
  "torso_twist": { name: "Torso Twist", primary: ["obliques"], secondary: ["lower_back"], category: "warmup" },
  "cat_cow": { name: "Cat-Cow Stretch", primary: ["lower_back", "mid_back"], secondary: ["abs"], category: "stretching" },
  "hamstring_stretch": { name: "Hamstring Stretch", primary: ["hamstrings"], secondary: ["calves"], category: "stretching" },
  "quad_stretch": { name: "Quad Stretch", primary: ["quads"], secondary: [], category: "stretching" },
  "chest_stretch": { name: "Chest Stretch", primary: ["chest"], secondary: ["front_delts"], category: "stretching" },
  "child_pose": { name: "Child's Pose", primary: ["lower_back", "lats"], secondary: ["glutes"], category: "stretching" },
};

export function getMuscleMapping(exerciseKey: string): { primary: string[]; secondary: string[] } | null {
  const ex = EXERCISE_DATABASE[exerciseKey];
  if (!ex) return null;
  return { primary: ex.primary, secondary: ex.secondary };
}

export function getExerciseName(key: string): string {
  return EXERCISE_DATABASE[key]?.name || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function getExercisesByCategory(category: string) {
  return Object.entries(EXERCISE_DATABASE)
    .filter(([_, v]) => v.category === category)
    .map(([k, v]) => ({ key: k, ...v }));
}

export function getAllExercises() {
  return Object.entries(EXERCISE_DATABASE).map(([k, v]) => ({ key: k, ...v }));
}
