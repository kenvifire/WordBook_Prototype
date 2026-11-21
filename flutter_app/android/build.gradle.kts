allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory = rootProject.layout.buildDirectory.dir("../../build").get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
// Workaround for plugins built before AGP 8 (e.g. isar_flutter_libs) that
// declare their namespace via the manifest package attribute instead of Gradle.
// Must be registered before evaluationDependsOn(":app") triggers evaluation.
subprojects {
    afterEvaluate {
        val android = project.extensions.findByName("android") ?: return@afterEvaluate
        try {
            val getNamespace = android.javaClass.getMethod("getNamespace")
            if (getNamespace.invoke(android) == null) {
                val manifest = project.file("src/main/AndroidManifest.xml")
                if (manifest.exists()) {
                    Regex("package=\"([^\"]+)\"").find(manifest.readText())
                        ?.groupValues?.get(1)?.let { pkg ->
                            android.javaClass
                                .getMethod("setNamespace", String::class.java)
                                .invoke(android, pkg)
                        }
                }
            }
        } catch (_: Exception) {
            // Plugin's android extension doesn't expose namespace; nothing to fix.
        }
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
