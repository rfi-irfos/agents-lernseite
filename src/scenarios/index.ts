import type { Scenario } from '../engine/types'
import { wetter } from './wetter'
import { flugsuche } from './flugsuche'
import { programm } from './programm'
import { foto } from './foto'
import { ausflug } from './ausflug'

export const scenarios: Scenario[] = [wetter, flugsuche, programm, foto, ausflug]
