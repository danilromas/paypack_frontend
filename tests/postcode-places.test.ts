import { describe, expect, it } from "vitest"
import { cityMatchesPlaces, parsePostcodePlaces, postcodeLookupKey } from "../lib/postcode-places"

describe("postcodeLookupKey", () => {
  it("spells postcodes the way the lookup service keys them", () => {
    expect(postcodeLookupKey("it", " 10035 ")).toEqual({ country: "IT", zip: "10035" })
    expect(postcodeLookupKey("NL", "1012 AB")).toEqual({ country: "NL", zip: "1012" })
    expect(postcodeLookupKey("PL", "00950")).toEqual({ country: "PL", zip: "00-950" })
    expect(postcodeLookupKey("PT", "1000001")).toEqual({ country: "PT", zip: "1000-001" })
    expect(postcodeLookupKey("CZ", "11000")).toEqual({ country: "CZ", zip: "110 00" })
    expect(postcodeLookupKey("SE", "114 55")).toEqual({ country: "SE", zip: "11455" })
    expect(postcodeLookupKey("LU", "1111")).toEqual({ country: "LU", zip: "L-1111" })
    expect(postcodeLookupKey("US", "98101-1234")).toEqual({ country: "US", zip: "98101" })
  })

  it("skips countries the lookup doesn't cover and malformed postcodes", () => {
    expect(postcodeLookupKey("EE", "10111")).toBeNull()
    expect(postcodeLookupKey("IT", "1003")).toBeNull()
    expect(postcodeLookupKey("IT", "")).toBeNull()
  })
})

describe("parsePostcodePlaces", () => {
  it("turns Italian apostrophe accents back into accented letters", () => {
    const places = parsePostcodePlaces(
      {
        places: [
          { "place name": "Mazze'", state: "Piemonte" },
          { "place name": "Tonengo Di Mazze'", state: "Piemonte" },
          { "place name": "Mazzè", state: "Piemonte" },
        ],
      },
      "IT",
    )
    expect(places).toEqual([
      { city: "Mazzè", region: "Piemonte" },
      { city: "Tonengo Di Mazzè", region: "Piemonte" },
    ])
  })

  it("returns nothing for an unexpected body", () => {
    expect(parsePostcodePlaces(null, "IT")).toEqual([])
    expect(parsePostcodePlaces({ places: "x" }, "IT")).toEqual([])
  })
})

describe("cityMatchesPlaces", () => {
  const places = [{ city: "Mazzè", region: null }, { city: "Tonengo Di Mazzè", region: null }]

  it("accepts the city however it is spelt", () => {
    expect(cityMatchesPlaces("mazze", places)).toBe(true)
    expect(cityMatchesPlaces("MAZZÈ", places)).toBe(true)
    expect(cityMatchesPlaces("Tonengo", places)).toBe(true)
    expect(cityMatchesPlaces("Frankfurt", [{ city: "Frankfurt am Main", region: null }])).toBe(true)
  })

  it("flags a city from somewhere else", () => {
    expect(cityMatchesPlaces("Borgoricco", places)).toBe(false)
  })

  it("has nothing to say without a city or places", () => {
    expect(cityMatchesPlaces("", places)).toBe(true)
    expect(cityMatchesPlaces("Borgoricco", [])).toBe(true)
  })
})
