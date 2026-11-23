
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "Area_Bosses": {
                  Row: {
                    "area_id": number,"level": number,"slot": number,"species_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": number,"level"?: number,"slot": number,"species_id": number
                  }
                  Update: {
                    "area_id"?: number,"level"?: number,"slot"?: number,"species_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Area_Bosses_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "Areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Area_Bosses_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    }
                  ]
                },"Area_Encounters": {
                  Row: {
                    "area_id": number,"id": number,"max_level": number,"min_level": number,"species_id": number,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": number,"id"?: number,"max_level"?: number,"min_level"?: number,"species_id": number,"weight"?: number
                  }
                  Update: {
                    "area_id"?: number,"id"?: number,"max_level"?: number,"min_level"?: number,"species_id"?: number,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Area_Encounters_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "Areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Area_Encounters_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    }
                  ]
                },"Area_Loot": {
                  Row: {
                    "area_id": number,"currency_code": string | null,"id": number,"item_id": number | null,"max_quantity": number,"min_quantity": number,"source": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": number,"currency_code"?: string | null,"id"?: number,"item_id"?: number | null,"max_quantity"?: number,"min_quantity"?: number,"source": string,"weight"?: number
                  }
                  Update: {
                    "area_id"?: number,"currency_code"?: string | null,"id"?: number,"item_id"?: number | null,"max_quantity"?: number,"min_quantity"?: number,"source"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Area_Loot_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "Areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Area_Loot_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "Currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "Area_Loot_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "Items"
      referencedColumns: ["id"]
    }
                  ]
                },"Area_Squares": {
                  Row: {
                    "area_id": number,"chest_rate": number,"choice_rate": number,"item_rate": number,"monster_rate": number,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": number,"chest_rate"?: number,"choice_rate"?: number,"item_rate"?: number,"monster_rate"?: number,"position": number
                  }
                  Update: {
                    "area_id"?: number,"chest_rate"?: number,"choice_rate"?: number,"item_rate"?: number,"monster_rate"?: number,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Area_Squares_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "Areas"
      referencedColumns: ["id"]
    }
                  ]
                },"Areas": {
                  Row: {
                    "clear_amount": number,"clear_currency_code": string,"description": string | null,"id": number,"image_path": string | null,"is_active": boolean,"is_tutorial": boolean,"max_enemies": number,"min_enemies": number,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "clear_amount"?: number,"clear_currency_code"?: string,"description"?: string | null,"id"?: number,"image_path"?: string | null,"is_active"?: boolean,"is_tutorial"?: boolean,"max_enemies"?: number,"min_enemies"?: number,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "clear_amount"?: number,"clear_currency_code"?: string,"description"?: string | null,"id"?: number,"image_path"?: string | null,"is_active"?: boolean,"is_tutorial"?: boolean,"max_enemies"?: number,"min_enemies"?: number,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Areas_clear_currency_code_fkey"
      columns: ["clear_currency_code"]
isOneToOne: false
      referencedRelation: "Currencies"
      referencedColumns: ["code"]
    }
                  ]
                },"Battles": {
                  Row: {
                    "created_at": string,"expedition_id": string,"id": string,"owner_id": string,"state": NonNullable<Json>,"status": string,"turn": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expedition_id": string,"id"?: string,"owner_id": string,"state": NonNullable<Json>,"status"?: string,"turn"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"expedition_id"?: string,"id"?: string,"owner_id"?: string,"state"?: NonNullable<Json>,"status"?: string,"turn"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "Battles_expedition_id_fkey"
      columns: ["expedition_id"]
isOneToOne: false
      referencedRelation: "Expeditions"
      referencedColumns: ["id"]
    }
                  ]
                },"Currencies": {
                  Row: {
                    "code": string,"name": string,"short_name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"name": string,"short_name": string,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"name"?: string,"short_name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"Element_Matchups": {
                  Row: {
                    "attack_element_id": number,"defense_element_id": number,"level": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attack_element_id": number,"defense_element_id": number,"level": string
                  }
                  Update: {
                    "attack_element_id"?: number,"defense_element_id"?: number,"level"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "Element_Matchups_attack_element_id_fkey"
      columns: ["attack_element_id"]
isOneToOne: false
      referencedRelation: "Elements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Element_Matchups_defense_element_id_fkey"
      columns: ["defense_element_id"]
isOneToOne: false
      referencedRelation: "Elements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Element_Matchups_level_fkey"
      columns: ["level"]
isOneToOne: false
      referencedRelation: "Resistance_Levels"
      referencedColumns: ["code"]
    }
                  ]
                },"Elements": {
                  Row: {
                    "description": string | null,"id": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: number,"name": string
                  }
                  Update: {
                    "description"?: string | null,"id"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"Expedition_Loot": {
                  Row: {
                    "currency_code": string | null,"expedition_id": string,"id": number,"item_id": number | null,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "currency_code"?: string | null,"expedition_id": string,"id"?: number,"item_id"?: number | null,"quantity": number
                  }
                  Update: {
                    "currency_code"?: string | null,"expedition_id"?: string,"id"?: number,"item_id"?: number | null,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Expedition_Loot_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "Currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "Expedition_Loot_expedition_id_fkey"
      columns: ["expedition_id"]
isOneToOne: false
      referencedRelation: "Expeditions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Expedition_Loot_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "Items"
      referencedColumns: ["id"]
    }
                  ]
                },"Expeditions": {
                  Row: {
                    "area_id": number,"battle_id": string | null,"ended_at": string | null,"id": string,"log": NonNullable<Json>,"owner_id": string,"party_state": NonNullable<Json>,"position": number,"started_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": number,"battle_id"?: string | null,"ended_at"?: string | null,"id"?: string,"log"?: NonNullable<Json>,"owner_id": string,"party_state"?: NonNullable<Json>,"position"?: number,"started_at"?: string,"status"?: string
                  }
                  Update: {
                    "area_id"?: number,"battle_id"?: string | null,"ended_at"?: string | null,"id"?: string,"log"?: NonNullable<Json>,"owner_id"?: string,"party_state"?: NonNullable<Json>,"position"?: number,"started_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "Expeditions_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "Areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Expeditions_battle_id_fkey"
      columns: ["battle_id"]
isOneToOne: false
      referencedRelation: "Battles"
      referencedColumns: ["id"]
    }
                  ]
                },"Guide_Pages": {
                  Row: {
                    "body": string,"key": string,"show_in_help": boolean,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"key": string,"show_in_help"?: boolean,"sort_order"?: number,"title": string
                  }
                  Update: {
                    "body"?: string,"key"?: string,"show_in_help"?: boolean,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"Items": {
                  Row: {
                    "description": string | null,"effect_type": string,"effect_value": number | null,"id": number,"image_path": string | null,"name": string,"usable_in_battle": boolean,"usable_in_field": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"effect_type"?: string,"effect_value"?: number | null,"id"?: number,"image_path"?: string | null,"name": string,"usable_in_battle"?: boolean,"usable_in_field"?: boolean
                  }
                  Update: {
                    "description"?: string | null,"effect_type"?: string,"effect_value"?: number | null,"id"?: number,"image_path"?: string | null,"name"?: string,"usable_in_battle"?: boolean,"usable_in_field"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"Monster_Skills": {
                  Row: {
                    "monster_id": string,"skill_id": number,"slot": number
                  }
                  ComputedFields: never
                  Insert: {
                    "monster_id": string,"skill_id": number,"slot": number
                  }
                  Update: {
                    "monster_id"?: string,"skill_id"?: number,"slot"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Monster_Skills_monster_id_fkey"
      columns: ["monster_id"]
isOneToOne: false
      referencedRelation: "Player_Monsters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Monster_Skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    }
                  ]
                },"Monster_Species": {
                  Row: {
                    "atk": number | null,"def": number | null,"description": string | null,"element_id": number | null,"exp_multiplier": number,"hp": number | null,"id": number,"image_path": string | null,"int": number | null,"mp": number | null,"name": string,"rank": string | null,"size": number | null,"spd": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atk"?: number | null,"def"?: number | null,"description"?: string | null,"element_id"?: number | null,"exp_multiplier"?: number,"hp"?: number | null,"id"?: number,"image_path"?: string | null,"int"?: number | null,"mp"?: number | null,"name": string,"rank"?: string | null,"size"?: number | null,"spd"?: number | null
                  }
                  Update: {
                    "atk"?: number | null,"def"?: number | null,"description"?: string | null,"element_id"?: number | null,"exp_multiplier"?: number,"hp"?: number | null,"id"?: number,"image_path"?: string | null,"int"?: number | null,"mp"?: number | null,"name"?: string,"rank"?: string | null,"size"?: number | null,"spd"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "Monster_Species_element_id_fkey"
      columns: ["element_id"]
isOneToOne: false
      referencedRelation: "Elements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Monster_Species_rank_fkey"
      columns: ["rank"]
isOneToOne: false
      referencedRelation: "Ranks"
      referencedColumns: ["code"]
    }
                  ]
                },"Player_Currencies": {
                  Row: {
                    "amount": number,"currency_code": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number,"currency_code": string,"owner_id": string
                  }
                  Update: {
                    "amount"?: number,"currency_code"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "Player_Currencies_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "Currencies"
      referencedColumns: ["code"]
    }
                  ]
                },"Player_Items": {
                  Row: {
                    "item_id": number,"owner_id": string,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "item_id": number,"owner_id": string,"quantity": number
                  }
                  Update: {
                    "item_id"?: number,"owner_id"?: string,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Player_Items_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "Items"
      referencedColumns: ["id"]
    }
                  ]
                },"Player_Monsters": {
                  Row: {
                    "alloc_atk": number,"alloc_def": number,"alloc_hp": number,"alloc_int": number,"alloc_mp": number,"alloc_spd": number,"exp": number,"id": string,"in_storage": boolean,"level": number,"level_cap": number,"limit_points": number,"nickname": string | null,"obtained_at": string,"owner_id": string,"party_slot": number | null,"source": string | null,"species_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alloc_atk"?: number,"alloc_def"?: number,"alloc_hp"?: number,"alloc_int"?: number,"alloc_mp"?: number,"alloc_spd"?: number,"exp"?: number,"id"?: string,"in_storage"?: boolean,"level"?: number,"level_cap"?: number,"limit_points"?: number,"nickname"?: string | null,"obtained_at"?: string,"owner_id": string,"party_slot"?: number | null,"source"?: string | null,"species_id": number
                  }
                  Update: {
                    "alloc_atk"?: number,"alloc_def"?: number,"alloc_hp"?: number,"alloc_int"?: number,"alloc_mp"?: number,"alloc_spd"?: number,"exp"?: number,"id"?: string,"in_storage"?: boolean,"level"?: number,"level_cap"?: number,"limit_points"?: number,"nickname"?: string | null,"obtained_at"?: string,"owner_id"?: string,"party_slot"?: number | null,"source"?: string | null,"species_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Player_Monsters_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "box_capacity": number,"created_at": string,"display_name": string,"id": string,"is_admin": boolean,"starter_chosen": boolean,"tutorial_state": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "box_capacity"?: number,"created_at"?: string,"display_name": string,"id": string,"is_admin"?: boolean,"starter_chosen"?: boolean,"tutorial_state"?: string,"updated_at"?: string
                  }
                  Update: {
                    "box_capacity"?: number,"created_at"?: string,"display_name"?: string,"id"?: string,"is_admin"?: boolean,"starter_chosen"?: boolean,"tutorial_state"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"Ranks": {
                  Row: {
                    "code": string,"exp_rate": number,"recruit_rate": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"exp_rate": number,"recruit_rate": number,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"exp_rate"?: number,"recruit_rate"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"Resistance_Levels": {
                  Row: {
                    "code": string,"effect": string,"multiplier": number,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"effect"?: string,"multiplier": number,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"effect"?: string,"multiplier"?: number,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"Size_Rules": {
                  Row: {
                    "size": number,"skill_slots": number
                  }
                  ComputedFields: never
                  Insert: {
                    "size": number,"skill_slots"?: number
                  }
                  Update: {
                    "size"?: number,"skill_slots"?: number
                  }
                  Relationships: [
                    
                  ]
                },"Skill_Effects": {
                  Row: {
                    "chance": number,"skill_id": number,"status_effect_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "chance"?: number,"skill_id": number,"status_effect_id": number
                  }
                  Update: {
                    "chance"?: number,"skill_id"?: number,"status_effect_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Skill_Effects_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Skill_Effects_status_effect_id_fkey"
      columns: ["status_effect_id"]
isOneToOne: false
      referencedRelation: "Status_Effects"
      referencedColumns: ["id"]
    }
                  ]
                },"Skills": {
                  Row: {
                    "accuracy": number,"attack_stat": string,"category": string,"defense_stat": string,"description": string | null,"element_id": number | null,"id": number,"mp_cost": number,"name": string | null,"power": number,"target": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy"?: number,"attack_stat"?: string,"category"?: string,"defense_stat"?: string,"description"?: string | null,"element_id"?: number | null,"id"?: number,"mp_cost"?: number,"name"?: string | null,"power"?: number,"target"?: string
                  }
                  Update: {
                    "accuracy"?: number,"attack_stat"?: string,"category"?: string,"defense_stat"?: string,"description"?: string | null,"element_id"?: number | null,"id"?: number,"mp_cost"?: number,"name"?: string | null,"power"?: number,"target"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "Skills_element_id_fkey"
      columns: ["element_id"]
isOneToOne: false
      referencedRelation: "Elements"
      referencedColumns: ["id"]
    }
                  ]
                },"Species_Element_Resistances": {
                  Row: {
                    "element_id": number,"level": string,"species_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "element_id": number,"level": string,"species_id": number
                  }
                  Update: {
                    "element_id"?: number,"level"?: string,"species_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Species_Element_Resistances_element_id_fkey"
      columns: ["element_id"]
isOneToOne: false
      referencedRelation: "Elements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Species_Element_Resistances_level_fkey"
      columns: ["level"]
isOneToOne: false
      referencedRelation: "Resistance_Levels"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "Species_Element_Resistances_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    }
                  ]
                },"Species_Skills": {
                  Row: {
                    "skill_id": number,"slot": number,"species_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "skill_id": number,"slot": number,"species_id": number
                  }
                  Update: {
                    "skill_id"?: number,"slot"?: number,"species_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Species_Skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Species_Skills_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    }
                  ]
                },"Species_Status_Resistances": {
                  Row: {
                    "level": string,"species_id": number,"status_effect_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "level": string,"species_id": number,"status_effect_id": number
                  }
                  Update: {
                    "level"?: string,"species_id"?: number,"status_effect_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Species_Status_Resistances_level_fkey"
      columns: ["level"]
isOneToOne: false
      referencedRelation: "Resistance_Levels"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "Species_Status_Resistances_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Species_Status_Resistances_status_effect_id_fkey"
      columns: ["status_effect_id"]
isOneToOne: false
      referencedRelation: "Status_Effects"
      referencedColumns: ["id"]
    }
                  ]
                },"Starter_Options": {
                  Row: {
                    "level": number,"message": string | null,"sort_order": number,"species_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "level"?: number,"message"?: string | null,"sort_order"?: number,"species_id": number
                  }
                  Update: {
                    "level"?: number,"message"?: string | null,"sort_order"?: number,"species_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Starter_Options_species_id_fkey"
      columns: ["species_id"]
isOneToOne: true
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    }
                  ]
                },"Status_Effects": {
                  Row: {
                    "description": string | null,"effect_type": string,"id": number,"name": string,"stages": number,"stat": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"effect_type"?: string,"id"?: number,"name": string,"stages"?: number,"stat"?: string | null
                  }
                  Update: {
                    "description"?: string | null,"effect_type"?: string,"id"?: number,"name"?: string,"stages"?: number,"stat"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"UI_Elements": {
                  Row: {
                    "height": number,"id": string,"props": NonNullable<Json>,"screen_key": string,"type": string,"width": number,"x": number,"y": number,"z_index": number
                  }
                  ComputedFields: never
                  Insert: {
                    "height"?: number,"id"?: string,"props"?: NonNullable<Json>,"screen_key": string,"type": string,"width"?: number,"x"?: number,"y"?: number,"z_index"?: number
                  }
                  Update: {
                    "height"?: number,"id"?: string,"props"?: NonNullable<Json>,"screen_key"?: string,"type"?: string,"width"?: number,"x"?: number,"y"?: number,"z_index"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "UI_Elements_screen_key_fkey"
      columns: ["screen_key"]
isOneToOne: false
      referencedRelation: "UI_Screens"
      referencedColumns: ["key"]
    }
                  ]
                },"UI_Screens": {
                  Row: {
                    "background_color": string | null,"background_image_path": string | null,"key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "background_color"?: string | null,"background_image_path"?: string | null,"key": string,"updated_at"?: string
                  }
                  Update: {
                    "background_color"?: string | null,"background_image_path"?: string | null,"key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "allocate_limit_point":
{ Args: { "p_monster_id": string,"p_stat": string }; Returns: number
                           },
"begin_expedition_battle":
{ Args: { "p_event": Json,"p_expected_position": number,"p_expedition_id": string,"p_state": Json }; Returns: string
                           },
"commit_battle_turn":
{ Args: { "p_battle_id": string,"p_boss"?: boolean,"p_event"?: Json,"p_exp"?: Json,"p_expected_turn": number,"p_item_id"?: number,"p_party_state"?: Json,"p_recruit"?: Json,"p_result"?: string,"p_state": Json }; Returns: Json
                           },
"commit_expedition_step":
{ Args: { "p_advance": boolean,"p_event": Json,"p_expected_position": number,"p_expedition_id": string,"p_finish"?: string,"p_loot"?: Json,"p_recruit"?: Json }; Returns: Json
                           },
"consume_item":
{ Args: { "p_item_id": number,"p_owner_id": string,"p_quantity"?: number }; Returns: number
                           },
"element_resistance":
{ Args: { "p_attack_element_id": number,"p_species_id": number }; Returns: string
                           },
"exp_to_next":
{ Args: { "p_level": number,"p_rank": string }; Returns: number
                           },
"grant_currency":
{ Args: { "p_amount": number,"p_currency_code": string,"p_owner_id": string }; Returns: number
                           },
"grant_exp":
{ Args: { "p_amount": number,"p_monster_id": string }; Returns: number
                           },
"grant_item":
{ Args: { "p_item_id": number,"p_owner_id": string,"p_quantity"?: number }; Returns: number
                           },
"grant_monster":
{ Args: { "p_level"?: number,"p_owner_id": string,"p_source"?: string,"p_species_id": number }; Returns: {
              "in_storage": boolean,"monster_id": string
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"move_monster":
{ Args: { "p_monster_id": string,"p_target_slot": number }; Returns: undefined
                           },
"rank_exp_rate":
{ Args: { "p_rank": string }; Returns: number
                           },
"release_monster":
{ Args: { "p_monster_id": string }; Returns: undefined
                           },
"reset_ui_layout":
{ Args: { "p_screen_key": string }; Returns: undefined
                           },
"save_ui_layout":
{ Args: { "p_background_color": string,"p_background_image_path": string,"p_elements": Json,"p_screen_key": string }; Returns: undefined
                           },
"skill_slots_for_species":
{ Args: { "p_species_id": number }; Returns: number
                           },
"spend_currency":
{ Args: { "p_amount": number,"p_currency_code": string,"p_owner_id": string }; Returns: number
                           },
"status_resistance":
{ Args: { "p_species_id": number,"p_status_effect_id": number }; Returns: string
                           },
"use_field_item":
{ Args: { "p_item_id": number }; Returns: undefined
                           },
"withdraw_from_storage":
{ Args: { "p_monster_id": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
