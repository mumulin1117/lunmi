import Foundation

enum LucentWonderment {
    @inline(never)
    static func willowSonority(_ balmyGlass: String) -> String {
        var obcordateHalo = String.UnicodeScalarView()
        var arcPeaceful = true
        for glowEnamel in balmyGlass.unicodeScalars {
            if arcPeaceful { obcordateHalo.append(glowEnamel) }
            arcPeaceful.toggle()
        }
        return String(obcordateHalo)
    }

    @inline(never)
    static func prismArpeggioDell(_ balmyGlass: String) -> Character {
        Character(willowSonority(balmyGlass))
    }
}
